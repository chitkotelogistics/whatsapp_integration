const db = require('../config/db');
const {
  readFallbackNegotiations,
  writeFallbackNegotiations,
  readFallbackLoads,
  writeFallbackLoads,
  readFallbackInbound,
  readFallbackLogs,
  readFallbackTransporters,
  readFallbackContacts,
} = require('../utils/fileStore');
const { sendMessage } = require('../services/whatsappService');
const { getSettingsConfig } = require('../services/settingsService');

const normalizePhone = (value = '') => {
  let cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('9191')) cleaned = cleaned.slice(2);
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `91${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  return cleaned;
};

// ==========================================
// 1. COMMERCIAL PRIVACY FILTERING ENGINE
// ==========================================
const filterLoadCommercials = (loadObj = {}, role = 'CK_OPERATIONS') => {
  const sanitized = { ...loadObj };
  const userRole = String(role || 'CK_OPERATIONS').toUpperCase();

  if (userRole === 'PARTY') {
    delete sanitized.transporter_rate;
    delete sanitized.ck_margin;
  } else if (userRole === 'TRANSPORTER') {
    delete sanitized.party_rate;
    delete sanitized.ck_margin;
  } else if (userRole === 'DRIVER') {
    delete sanitized.party_rate;
    delete sanitized.transporter_rate;
    delete sanitized.ck_margin;
    delete sanitized.freight;
  }

  return sanitized;
};

// ==========================================
// 2. MULTI-TRANSPORTER NEGOTIATION ENDPOINTS
// ==========================================

const submitNegotiation = async (req, res) => {
  const { loadId, transporter_id, transporter_mobile, transporter_name, offered_rate, status, notes } = req.body;
  const normMobile = normalizePhone(transporter_mobile);

  if (!loadId || !offered_rate || !normMobile) {
    return res.status(400).json({ success: false, error: 'Load ID, Transporter Mobile, and Offered Rate are required' });
  }

  const quoteObj = {
    id: Date.now(),
    load_id: loadId,
    transporter_id: transporter_id ? Number(transporter_id) : null,
    transporter_mobile: normMobile,
    transporter_name: transporter_name || `Transporter (${normMobile.slice(-10)})`,
    offered_rate: Number(offered_rate),
    status: status || 'PENDING',
    notes: notes || '',
    created_at: new Date().toISOString(),
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO load_negotiations (load_id, transporter_id, transporter_mobile, transporter_name, offered_rate, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        quoteObj.load_id,
        quoteObj.transporter_id,
        quoteObj.transporter_mobile,
        quoteObj.transporter_name,
        quoteObj.offered_rate,
        quoteObj.status,
        quoteObj.notes,
      ]
    );
    if (result && result.insertId) {
      quoteObj.id = result.insertId;
    }
  } catch (err) {}

  const fallback = readFallbackNegotiations();
  writeFallbackNegotiations([quoteObj, ...fallback]);

  res.status(201).json({ success: true, quote: quoteObj });
};

const getLoadNegotiations = async (req, res) => {
  const { loadId } = req.params;
  const fallback = readFallbackNegotiations();

  try {
    const [rows] = await db.query(
      'SELECT * FROM load_negotiations WHERE load_id = ? ORDER BY created_at DESC',
      [loadId]
    );
    const seenIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const item of fallback) {
      if (String(item.load_id) === String(loadId) && !seenIds.has(String(item.id))) {
        merged.push(item);
      }
    }
    res.json(merged);
  } catch (err) {
    const filtered = fallback.filter((n) => String(n.load_id) === String(loadId));
    res.json(filtered);
  }
};

const acceptTransporterOffer = async (req, res) => {
  const { loadId, negotiationId, transporter_id, final_rate } = req.body;

  if (!loadId || !final_rate) {
    return res.status(400).json({ success: false, error: 'Load ID and final rate are required' });
  }

  const rateNum = Number(final_rate);

  // 1. Update negotiation status to ACCEPTED
  try {
    if (negotiationId) {
      await db.execute('UPDATE load_negotiations SET status = "ACCEPTED" WHERE id = ?', [negotiationId]);
      await db.execute('UPDATE load_negotiations SET status = "REJECTED" WHERE load_id = ? AND id != ?', [loadId, negotiationId]);
    }
  } catch (err) {}

  // Update fallback negotiations
  const fallbackNegs = readFallbackNegotiations();
  const nextNegs = fallbackNegs.map((n) => {
    if (String(n.load_id) === String(loadId)) {
      if (negotiationId && String(n.id) === String(negotiationId)) {
        return { ...n, status: 'ACCEPTED' };
      }
      return { ...n, status: 'REJECTED' };
    }
    return n;
  });
  writeFallbackNegotiations(nextNegs);

  // 2. Update Load record with confirmed transporter_rate and status
  try {
    const [existing] = await db.query('SELECT party_rate FROM loads WHERE load_id = ? OR id = ?', [loadId, loadId]);
    const partyRate = existing[0] ? Number(existing[0].party_rate || 0) : 0;
    const margin = partyRate ? partyRate - rateNum : 0;

    await db.execute(
      `UPDATE loads SET transporter_id = COALESCE(?, transporter_id), transporter_rate = ?, ck_margin = ?, status = "RATE_CONFIRMED" WHERE load_id = ? OR id = ?`,
      [transporter_id ? Number(transporter_id) : null, rateNum, margin, loadId, loadId]
    );
  } catch (err) {}

  // Update fallback loads
  const fallbackLoads = readFallbackLoads();
  const nextLoads = fallbackLoads.map((l) => {
    if (String(l.load_id) === String(loadId) || String(l.loadId) === String(loadId) || String(l.id) === String(loadId)) {
      const pRate = Number(l.party_rate || 0);
      const marg = pRate ? pRate - rateNum : Number(l.ck_margin || 0);
      return {
        ...l,
        transporter_id: transporter_id ? Number(transporter_id) : l.transporter_id,
        transporter_rate: rateNum,
        ck_margin: marg,
        status: 'RATE_CONFIRMED',
        updated_at: new Date().toISOString(),
      };
    }
    return l;
  });
  writeFallbackLoads(nextLoads);

  res.json({ success: true, message: `Offer of ₹${rateNum} accepted for Load ${loadId}`, final_rate: rateNum });
};

// ==========================================
// 3. TWO-WAY WHATSAPP INBOX & CHAT THREADS
// ==========================================

const getInboxThreads = async (req, res) => {
  const fallbackInbound = readFallbackInbound();
  const fallbackLogs = readFallbackLogs();
  const fallbackLoads = readFallbackLoads();
  const fallbackTransporters = readFallbackTransporters();
  const fallbackContacts = readFallbackContacts();

  let dbInbound = [];
  let dbLogs = [];
  try {
    const [rIn] = await db.query('SELECT * FROM inbound_messages ORDER BY created_at DESC');
    dbInbound = rIn;
  } catch (e) {}

  try {
    const [rLog] = await db.query('SELECT * FROM message_logs ORDER BY created_at DESC');
    dbLogs = rLog;
  } catch (e) {}

  // Combine all inbound and outbound messages
  const allMessages = [];

  // Inbound messages
  [...dbInbound, ...fallbackInbound].forEach((msg) => {
    const normMob = normalizePhone(msg.mobile);
    if (!normMob) return;
    allMessages.push({
      id: msg.id || `in_${Date.now()}_${Math.random()}`,
      direction: 'INBOUND',
      mobile: normMob,
      sender_name: msg.sender_name || `Contact (${normMob.slice(-10)})`,
      message: msg.message || '',
      created_at: msg.created_at || new Date().toISOString(),
    });
  });

  // Outbound message logs
  [...dbLogs, ...fallbackLogs].forEach((log) => {
    const normMob = normalizePhone(log.mobile);
    if (!normMob) return;
    allMessages.push({
      id: log.id || `out_${Date.now()}_${Math.random()}`,
      direction: 'OUTBOUND',
      mobile: normMob,
      sender_name: 'Chitkote Logistics Staff',
      message: log.message || '',
      status: log.status || 'SENT',
      created_at: log.created_at || new Date().toISOString(),
    });
  });

  // Sort descending by date
  allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Group messages by contact mobile
  const threadMap = new Map();

  for (const msg of allMessages) {
    const mobile = msg.mobile;
    if (!threadMap.has(mobile)) {
      // Find contact role / name
      const contactInfo = [...fallbackTransporters, ...fallbackContacts].find(
        (c) => normalizePhone(c.mobile) === mobile
      );

      // Detect linked load ID from message body
      const loadMatch = msg.message.match(/CK-\d+/i);
      const linkedLoadId = loadMatch ? loadMatch[0].toUpperCase() : null;

      threadMap.set(mobile, {
        mobile,
        contact_name: contactInfo ? (contactInfo.company_name || contactInfo.name || msg.sender_name) : msg.sender_name,
        role: contactInfo && contactInfo.bank_account ? 'TRANSPORTER' : 'CONTACT',
        load_id: linkedLoadId,
        last_message: msg.message,
        last_message_time: msg.created_at,
        last_direction: msg.direction,
        unread_count: msg.direction === 'INBOUND' ? 1 : 0,
        messages: [],
      });
    }

    const thread = threadMap.get(mobile);
    thread.messages.push(msg);

    if (!thread.load_id) {
      const loadMatch = msg.message.match(/CK-\d+/i);
      if (loadMatch) {
        thread.load_id = loadMatch[0].toUpperCase();
      }
    }
  }

  const threads = Array.from(threadMap.values());
  res.json(threads);
};

const sendDirectReply = async (req, res) => {
  const { mobile, message, loadId } = req.body;
  const normMobile = normalizePhone(mobile);

  if (!normMobile || !message) {
    return res.status(400).json({ success: false, error: 'Recipient Mobile and Message are required' });
  }

  let formattedMessage = message;
  if (loadId && !message.includes(loadId)) {
    formattedMessage = `[${loadId}] ${message}`;
  }

  try {
    const config = await getSettingsConfig();
    const result = await sendMessage(config, {
      to: normMobile,
      message: formattedMessage,
      type: 'text',
    });

    res.json({ success: true, messageId: result?.messages?.[0]?.id || null, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  filterLoadCommercials,
  submitNegotiation,
  getLoadNegotiations,
  acceptTransporterOffer,
  getInboxThreads,
  sendDirectReply,
};
