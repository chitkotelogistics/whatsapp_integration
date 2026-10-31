const db = require('../config/db');
const { generateLoadId, formatWhatsAppMessage } = require('../utils/helpers');
const { sendMessage, queueSend, validateContacts, buildLoadNotificationTemplate } = require('../services/whatsappService');
const { getSettingsConfig } = require('../services/settingsService');
const { readFallbackLoads, writeFallbackLoads, readFallbackContacts, writeFallbackContacts, readFallbackSettings, writeFallbackSettings, readFallbackLogs, writeFallbackLogs, readFallbackInbound, writeFallbackInbound, readFallbackDrafts, writeFallbackDrafts } = require('../utils/fileStore');

const memoryLogs = [];
// Idempotency cache to prevent duplicate webhook processing (stores up to 5,000 recent message IDs)
const processedWebhookMessageIds = new Set();

const normalizePhone = (value = '') => {
  let cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('9191')) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]/.test(cleaned.slice(2))) {
    return cleaned;
  }

  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return `91${cleaned.slice(1)}`;
  }

  return '';
};

const getContactsByIds = async (contactIds) => {
  if (!Array.isArray(contactIds) || !contactIds.length) {
    return [];
  }

  const strIds = new Set(contactIds.map((id) => String(id).trim()));
  const rawItems = Array.from(strIds);

  const contacts = [];
  const fallbackContacts = readFallbackContacts();

  // 1. Try DB lookup by numeric ID or mobile
  try {
    const [dbRows] = await db.query('SELECT * FROM contacts');
    for (const row of dbRows) {
      const rowIdStr = String(row.id);
      const rowMobNorm = normalizePhone(row.mobile);
      if (strIds.has(rowIdStr) || (rowMobNorm && strIds.has(rowMobNorm))) {
        if (!contacts.some((c) => String(c.id) === rowIdStr)) {
          contacts.push(row);
        }
      }
    }
  } catch (dbErr) {
    // DB error ignore
  }

  // 2. Try Fallback JSON store lookup
  for (const fb of fallbackContacts) {
    const fbIdStr = String(fb.id);
    const fbMobNorm = normalizePhone(fb.mobile);
    if (strIds.has(fbIdStr) || (fbMobNorm && strIds.has(fbMobNorm))) {
      if (!contacts.some((c) => String(c.id) === fbIdStr || normalizePhone(c.mobile) === fbMobNorm)) {
        contacts.push(fb);
      }
    }
  }

  // 3. For any remaining item that is an explicit raw mobile number (not an ID)
  const foundMobiles = new Set(contacts.map((c) => normalizePhone(c.mobile)).filter(Boolean));
  for (const item of rawItems) {
    const norm = normalizePhone(item);
    if (norm && !foundMobiles.has(norm)) {
      contacts.push({
        id: item,
        name: `Direct Recipient (${norm.slice(-10)})`,
        mobile: norm,
      });
      foundMobiles.add(norm);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('getContactsByIds resolved:', { rawItems, foundCount: contacts.length, numbers: contacts.map((c) => c.mobile) });
  }

  return contacts;
};

const persistMessageLog = async (payload) => {
  const logEntry = {
    contactId: payload.contactId || null,
    mobile: payload.mobile || null,
    message: payload.message,
    status: payload.status,
    responseData: payload.responseData || null,
    messageId: payload.messageId || null,
    message_id: payload.messageId || null,
    created_at: new Date().toISOString(),
    fallback: true,
  };

  try {
    await db.execute(
      'INSERT INTO message_logs (contact_id, mobile, message, status, response_data, message_id) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.contactId || null, payload.mobile || null, payload.message, payload.status, payload.responseData || null, payload.messageId || null]
    );
  } catch (error) {
    memoryLogs.unshift(logEntry);
    if (memoryLogs.length > 500) {
      memoryLogs.length = 500;
    }
    const currentFallbackLogs = readFallbackLogs();
    writeFallbackLogs([logEntry, ...currentFallbackLogs].slice(0, 500));
  }
};

const getLoads = async (_req, res) => {
  const fallbackLoads = readFallbackLoads();
  try {
    const [rows] = await db.query('SELECT * FROM loads ORDER BY id DESC LIMIT 50');
    const existingKeys = new Set(rows.map((r) => String(r.id || r.load_id || r.loadId)));
    const merged = [...rows];
    for (const load of fallbackLoads) {
      const key = String(load.id || load.loadId);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        merged.push(load);
      }
    }
    res.json(merged);
  } catch (error) {
    res.json(fallbackLoads.slice(0, 50));
  }
};

const createLoad = async (req, res) => {
  const loadId = req.body.loadId || req.body.load_id || generateLoadId();
  const messageBody = req.body.message || req.body.message_body || formatWhatsAppMessage({ ...req.body, loadId });

  const party_id = req.body.party_id ? Number(req.body.party_id) : null;
  const party_rate = req.body.party_rate ? Number(req.body.party_rate) : (req.body.freight ? Number(String(req.body.freight).replace(/\D/g, '')) || 0 : 0);
  const transporter_id = req.body.transporter_id ? Number(req.body.transporter_id) : null;
  const transporter_rate = req.body.transporter_rate ? Number(req.body.transporter_rate) : 0;
  const ck_margin = (party_rate && transporter_rate) ? (party_rate - transporter_rate) : (req.body.ck_margin ? Number(req.body.ck_margin) : 0);
  const vehicle_id = req.body.vehicle_id ? Number(req.body.vehicle_id) : null;
  const driver_id = req.body.driver_id ? Number(req.body.driver_id) : null;
  const status = req.body.status || 'LOAD_CREATED';
  const required_documents = req.body.required_documents || {
    rc: true,
    insurance: true,
    puc: true,
    driver_license: true,
    permit: false,
    fitness: false,
  };

  const loadObj = {
    id: Date.now(),
    loadId,
    load_id: loadId,
    message: messageBody,
    message_body: messageBody,
    from: req.body.from || req.body.from_city,
    from_city: req.body.from || req.body.from_city,
    to: req.body.to || req.body.to_city,
    to_city: req.body.to || req.body.to_city,
    material: req.body.material,
    weight: req.body.weight,
    vehicleType: req.body.vehicleType || req.body.vehicle_type,
    vehicle_type: req.body.vehicleType || req.body.vehicle_type,
    loadingDate: req.body.loadingDate || req.body.loading_date,
    loading_date: req.body.loadingDate || req.body.loading_date,
    freight: req.body.freight || String(party_rate || transporter_rate || ''),
    contactPerson: req.body.contactPerson || req.body.contact_person,
    contact_person: req.body.contactPerson || req.body.contact_person,
    contactNumber: req.body.contactNumber || req.body.contact_number,
    contact_number: req.body.contactNumber || req.body.contact_number,
    party_id,
    party_rate,
    transporter_id,
    transporter_rate,
    ck_margin,
    vehicle_id,
    driver_id,
    status,
    required_documents,
    created_at: new Date().toISOString(),
    fallback: true,
  };

  const fallbackLoads = readFallbackLoads();
  writeFallbackLoads([loadObj, ...fallbackLoads]);

  try {
    const [result] = await db.execute(
      `INSERT INTO loads 
       (from_city, to_city, material, weight, vehicle_type, loading_date, freight, contact_person, contact_number, load_id, message_body, party_id, party_rate, transporter_id, transporter_rate, ck_margin, vehicle_id, driver_id, status, required_documents) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loadObj.from_city,
        loadObj.to_city,
        loadObj.material,
        loadObj.weight,
        loadObj.vehicle_type,
        loadObj.loading_date,
        loadObj.freight,
        loadObj.contact_person,
        loadObj.contact_number,
        loadId,
        messageBody,
        party_id,
        party_rate,
        transporter_id,
        transporter_rate,
        ck_margin,
        vehicle_id,
        driver_id,
        status,
        JSON.stringify(required_documents),
      ]
    );
    if (result && result.insertId) {
      loadObj.id = result.insertId;
    }
  } catch (error) {
    // DB write optional
  }

  res.status(201).json({ success: true, loadId, message: messageBody, load: loadObj });
};

const updateLoad = async (req, res) => {
  const { id } = req.params;
  const party_id = req.body.party_id ? Number(req.body.party_id) : null;
  const party_rate = req.body.party_rate !== undefined ? Number(req.body.party_rate) : undefined;
  const transporter_id = req.body.transporter_id ? Number(req.body.transporter_id) : null;
  const transporter_rate = req.body.transporter_rate !== undefined ? Number(req.body.transporter_rate) : undefined;
  const vehicle_id = req.body.vehicle_id ? Number(req.body.vehicle_id) : null;
  const driver_id = req.body.driver_id ? Number(req.body.driver_id) : null;
  const status = req.body.status;
  const required_documents = req.body.required_documents;

  try {
    const [existing] = await db.query('SELECT * FROM loads WHERE id = ? OR load_id = ?', [id, id]);
    const current = existing[0] || {};
    
    const newPartyRate = party_rate !== undefined ? party_rate : Number(current.party_rate || 0);
    const newTransporterRate = transporter_rate !== undefined ? transporter_rate : Number(current.transporter_rate || 0);
    const newCkMargin = (newPartyRate && newTransporterRate) ? (newPartyRate - newTransporterRate) : Number(current.ck_margin || 0);

    await db.execute(
      `UPDATE loads SET 
       from_city = ?, to_city = ?, material = ?, weight = ?, vehicle_type = ?, loading_date = ?, freight = ?, contact_person = ?, contact_number = ?, message_body = ?,
       party_id = ?, party_rate = ?, transporter_id = ?, transporter_rate = ?, ck_margin = ?, vehicle_id = ?, driver_id = ?, status = COALESCE(?, status), required_documents = COALESCE(?, required_documents)
       WHERE id = ? OR load_id = ?`,
      [
        req.body.from || req.body.from_city || current.from_city,
        req.body.to || req.body.to_city || current.to_city,
        req.body.material || current.material,
        req.body.weight || current.weight,
        req.body.vehicleType || req.body.vehicle_type || current.vehicle_type,
        req.body.loadingDate || req.body.loading_date || current.loading_date,
        req.body.freight || current.freight,
        req.body.contactPerson || req.body.contact_person || current.contact_person,
        req.body.contactNumber || req.body.contact_number || current.contact_number,
        req.body.message || formatWhatsAppMessage({ ...req.body, loadId: current.load_id || req.body.loadId }),
        party_id || current.party_id,
        newPartyRate,
        transporter_id || current.transporter_id,
        newTransporterRate,
        newCkMargin,
        vehicle_id || current.vehicle_id,
        driver_id || current.driver_id,
        status || current.status,
        required_documents ? JSON.stringify(required_documents) : current.required_documents,
        id,
        id,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    // fallback update for file-backed loads
    const fallbackLoads = readFallbackLoads();
    const idx = fallbackLoads.findIndex((l) => String(l.id) === String(id) || String(l.loadId) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Load not found' });
    }

    const cur = fallbackLoads[idx];
    const newPartyRate = party_rate !== undefined ? party_rate : (cur.party_rate || 0);
    const newTransporterRate = transporter_rate !== undefined ? transporter_rate : (cur.transporter_rate || 0);
    const newCkMargin = (newPartyRate && newTransporterRate) ? (newPartyRate - newTransporterRate) : (cur.ck_margin || 0);

    const updated = {
      ...cur,
      from: req.body.from || req.body.from_city || cur.from || cur.from_city,
      from_city: req.body.from || req.body.from_city || cur.from || cur.from_city,
      to: req.body.to || req.body.to_city || cur.to || cur.to_city,
      to_city: req.body.to || req.body.to_city || cur.to || cur.to_city,
      material: req.body.material || cur.material,
      weight: req.body.weight || cur.weight,
      vehicleType: req.body.vehicleType || req.body.vehicle_type || cur.vehicleType,
      vehicle_type: req.body.vehicleType || req.body.vehicle_type || cur.vehicle_type,
      loadingDate: req.body.loadingDate || req.body.loading_date || cur.loadingDate,
      loading_date: req.body.loadingDate || req.body.loading_date || cur.loading_date,
      freight: req.body.freight || cur.freight,
      contactPerson: req.body.contactPerson || req.body.contact_person || cur.contactPerson,
      contactNumber: req.body.contactNumber || req.body.contact_number || cur.contactNumber,
      party_id: party_id || cur.party_id,
      party_rate: newPartyRate,
      transporter_id: transporter_id || cur.transporter_id,
      transporter_rate: newTransporterRate,
      ck_margin: newCkMargin,
      vehicle_id: vehicle_id || cur.vehicle_id,
      driver_id: driver_id || cur.driver_id,
      status: status || cur.status || 'LOAD_CREATED',
      required_documents: required_documents || cur.required_documents,
      message: req.body.message || formatWhatsAppMessage({ ...req.body, loadId: cur.loadId }),
      updated_at: new Date().toISOString(),
    };

    fallbackLoads[idx] = updated;
    writeFallbackLoads(fallbackLoads);
    return res.json({ success: true, fallback: true, load: updated });
  }
};


const deleteLoad = async (req, res) => {
  const { id } = req.params;
  try {
    const numId = Number(id);
    if (Number.isInteger(numId) && numId <= 2147483647) {
      await db.execute('DELETE FROM loads WHERE id = ?', [numId]);
    }
  } catch (error) {
    // ignore DB error
  }

  const fallbackLoads = readFallbackLoads();
  const nextLoads = fallbackLoads.filter((l) => String(l.id) !== String(id) && String(l.loadId) !== String(id));
  writeFallbackLoads(nextLoads);

  res.json({ success: true, id });
};

const clearAllLoads = async (_req, res) => {
  try {
    await db.execute('DELETE FROM loads');
  } catch (error) {
    // ignore DB error
  }
  writeFallbackLoads([]);
  res.json({ success: true, message: 'All load postings cleared' });
};

const broadcastLoads = async (req, res) => {
  try {
    const { contactIds, rawContacts, message, type = 'text', scheduledAt, mediaUrl, caption, template } = req.body;

    if ((!Array.isArray(contactIds) || !contactIds.length) && (!Array.isArray(rawContacts) || !rawContacts.length)) {
      return res.status(400).json({ success: false, error: 'No contacts selected for broadcast' });
    }

    let resolvedContacts = [];
    if (Array.isArray(contactIds) && contactIds.length) {
      resolvedContacts = await getContactsByIds(contactIds);
    }

    if (Array.isArray(rawContacts) && rawContacts.length) {
      resolvedContacts = [...resolvedContacts, ...rawContacts];
    }

    // Deduplicate target contacts by mobile number
    const uniqueContactsMap = new Map();
    for (const c of resolvedContacts) {
      const normMob = normalizePhone(c.mobile);
      if (normMob && !uniqueContactsMap.has(normMob)) {
        uniqueContactsMap.set(normMob, { ...c, mobile: normMob });
      }
    }
    const contacts = Array.from(uniqueContactsMap.values());

    if (!contacts.length) {
      return res.status(400).json({ success: false, error: 'Selected contacts not found' });
    }

    const queuedMessage = message || 'Hello from Chitkote Logistics';

    const queueItems = contacts.map((contact) => ({
      to: contact.mobile,
      message: queuedMessage,
      type: type || 'template',
      mediaUrl,
      caption,
      template: template || buildLoadNotificationTemplate(queuedMessage),
    }));

    if (process.env.NODE_ENV !== 'production') {
      console.log('broadcastLoads request', {
        contactIds,
        contacts: contacts.map((c) => ({ id: c.id, mobile: c.mobile })),
        queueItems,
      });
    }

    const config = await getSettingsConfig();

    let isScheduledSuccessfully = false;
    if (scheduledAt) {
      const scheduleTime = new Date(scheduledAt);
      if (Number.isNaN(scheduleTime.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid scheduledAt timestamp' });
      }

      try {
        for (const contact of contacts) {
          const [scheduledResult] = await db.execute(
            'INSERT INTO scheduled_messages (contact_id, mobile, message, type, scheduled_at, status) VALUES (?, ?, ?, ?, ?, ?)',
            [contact.id, contact.mobile, queuedMessage, type, scheduleTime.toISOString().slice(0, 19).replace('T', ' '), 'pending']
          );
          await db.execute(
            'INSERT INTO message_logs (contact_id, scheduled_message_id, mobile, message, status) VALUES (?, ?, ?, ?, ?)',
            [contact.id, scheduledResult.insertId, contact.mobile, queuedMessage, 'pending']
          );
        }
        isScheduledSuccessfully = true;
      } catch (dbErr) {
        console.warn('Scheduled DB insert warning, falling back to immediate dispatch:', dbErr.message);
        isScheduledSuccessfully = false;
      }

      if (isScheduledSuccessfully) {
        return res.json({ success: true, scheduled: queueItems.length, scheduledAt: scheduleTime.toISOString() });
      }
    }

    const sendResults = await queueSend(config, queueItems);

    for (let i = 0; i < contacts.length; i += 1) {
      const contact = contacts[i];
      const result = sendResults[i] || {};
      const isFailed = result.error || false;
      const messageId = result?.messages?.[0]?.id || null;
      await persistMessageLog({
        contactId: contact.id,
        mobile: contact.mobile,
        message: queuedMessage,
        status: isFailed ? 'failed' : 'sent',
        responseData: JSON.stringify(result),
        messageId,
      });
    }

    const failedCount = sendResults.filter((r) => r.error).length;
    const sentCount = sendResults.filter((r) => !r.error).length;
    const failureReasons = Array.from(new Set(sendResults.filter((r) => r.error && r.message).map((r) => r.message)));

    res.json({
      success: sentCount > 0,
      total: queueItems.length,
      sentCount,
      failedCount,
      failureReasons,
      results: sendResults,
    });
  } catch (error) {
    console.error('broadcastLoads error:', error && error.stack ? error.stack : error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
};

const validateContactsEndpoint = async (req, res) => {
  try {
    const { contactIds, contacts } = req.body;
    let numbers = [];

    if (Array.isArray(contactIds) && contactIds.length) {
      try {
        const foundContacts = await getContactsByIds(contactIds);
        numbers = foundContacts.map((contact) => contact.mobile).filter(Boolean);
      } catch (dbError) {
        numbers = [];
      }

      if (!numbers.length && Array.isArray(contacts) && contacts.length) {
        numbers = contacts;
      }
    } else if (Array.isArray(contacts) && contacts.length) {
      numbers = contacts;
    } else {
      return res.status(400).json({ success: false, error: 'No contacts provided for validation' });
    }

    const config = await getSettingsConfig();
    const validation = await validateContacts(config, numbers);
    res.json({ success: true, validation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const sendTestMessage = async (req, res) => {
  try {
    const { contactIds, contacts, message = 'What can I help you today?', type = 'text', mediaUrl, caption, template } = req.body;
    let numbers = [];

    if (Array.isArray(contactIds) && contactIds.length) {
      try {
        const foundContacts = await getContactsByIds(contactIds);
        numbers = foundContacts.map((contact) => contact.mobile).filter(Boolean);
      } catch (dbError) {
        numbers = [];
      }

      if (!numbers.length && Array.isArray(contacts) && contacts.length) {
        numbers = contacts;
      }
    } else if (Array.isArray(contacts) && contacts.length) {
      numbers = contacts;
    } else {
      return res.status(400).json({ success: false, error: 'No contacts provided for test message' });
    }

    if (!numbers.length) {
      return res.status(400).json({ success: false, error: 'No valid contact numbers found for test message' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('sendTestMessage request', { contactIds, numbers });
    }

    const config = await getSettingsConfig();

    try {
      await validateContacts(config, numbers);
    } catch (error) {
      // Ignore validation failure and proceed with send; Meta send path is the authoritative delivery attempt.
    }

    const items = numbers.map((to) => ({ to, message, type, mediaUrl, caption, template }));
    const results = await queueSend(config, items);

    for (let i = 0; i < numbers.length; i += 1) {
      const to = numbers[i];
      const result = results[i] || {};
      const isFailed = result.error || false;
      const messageId = result?.messages?.[0]?.id || null;
      await persistMessageLog({
        mobile: to,
        message,
        status: isFailed ? 'failed' : 'sent',
        responseData: JSON.stringify(result),
        messageId,
      });
    }

    const failedCount = results.filter((r) => r.error).length;
    const sentCount = results.filter((r) => !r.error).length;
    const failureReasons = Array.from(new Set(results.filter((r) => r.error && r.message).map((r) => r.message)));

    res.json({
      success: sentCount > 0,
      sentCount,
      failedCount,
      failureReasons,
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSettings = async (req, res) => {
  const fallback = readFallbackSettings();
  try {
    const [rows] = await db.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    const settings = rows[0] || fallback;
    res.json({
      phone_number_id: settings.phone_number_id || fallback.phone_number_id || '',
      business_account_id: settings.business_account_id || fallback.business_account_id || '',
      access_token: settings.access_token || fallback.access_token || '',
      webhook_verify_token: settings.webhook_verify_token || fallback.webhook_verify_token || 'chitkote_webhook_secret_123',
    });
  } catch (error) {
    res.json(fallback);
  }
};

const saveSettings = async (req, res) => {
  const payload = req.body;
  const newSettings = {
    phone_number_id: payload.phoneNumberId || payload.phone_number_id || '',
    business_account_id: payload.businessAccountId || payload.business_account_id || '',
    access_token: payload.accessToken || payload.access_token || '',
    webhook_verify_token: payload.webhookVerifyToken || payload.webhook_verify_token || 'chitkote_webhook_secret_123',
  };

  writeFallbackSettings(newSettings);

  try {
    await db.query('DELETE FROM settings');
    await db.query(
      'INSERT INTO settings (phone_number_id, business_account_id, access_token, webhook_verify_token) VALUES (?, ?, ?, ?)',
      [newSettings.phone_number_id, newSettings.business_account_id, newSettings.access_token, newSettings.webhook_verify_token]
    );
  } catch (error) {
    // DB write warning handled via fileStore fallback
  }

  res.json({ success: true, settings: newSettings });
};

const getMessageLogs = async (req, res) => {
  const fallbackLogs = readFallbackLogs();
  try {
    const [rows] = await db.query('SELECT * FROM message_logs ORDER BY created_at DESC');
    const existingIds = new Set(rows.map((r) => r.id));
    const merged = rows.concat(fallbackLogs.filter((l) => !l.id || !existingIds.has(l.id)));
    res.json(merged);
  } catch (error) {
    const memoryAndFallback = [...memoryLogs];
    const memSet = new Set(memoryAndFallback.map((m) => String(m.messageId || m.created_at)));
    for (const log of fallbackLogs) {
      const key = String(log.messageId || log.created_at);
      if (!memSet.has(key)) {
        memoryAndFallback.push(log);
        memSet.add(key);
      }
    }
    res.json(memoryAndFallback);
  }
};

const clearAllMessageHistory = async (_req, res) => {
  try {
    await db.execute('DELETE FROM message_logs');
    await db.execute('DELETE FROM webhook_events');
    await db.execute('DELETE FROM inbound_messages');
  } catch (e) {
    // DB error ignore
  }
  memoryLogs.length = 0;
  writeFallbackLogs([]);
  writeFallbackInbound([]);
  res.json({ success: true, message: 'Message history cleared' });
};

const retryFailedMessages = async (req, res) => {
  try {
    const { id, ids } = req.body || {};
    let rows = [];

    if (id) {
      try {
        const [found] = await db.query('SELECT * FROM message_logs WHERE id = ?', [id]);
        rows = found;
      } catch (e) {
        rows = memoryLogs.filter((m) => String(m.id) === String(id));
      }
    } else if (Array.isArray(ids) && ids.length) {
      try {
        const [found] = await db.query('SELECT * FROM message_logs WHERE id IN (?)', [ids]);
        rows = found;
      } catch (e) {
        const strSet = new Set(ids.map((x) => String(x)));
        rows = memoryLogs.filter((m) => strSet.has(String(m.id)));
      }
    } else {
      try {
        const [found] = await db.query('SELECT * FROM message_logs WHERE status = "failed"');
        rows = found;
      } catch (e) {
        rows = memoryLogs.filter((m) => String(m.status).toLowerCase().includes('fail'));
      }
    }

    if (!rows.length) {
      return res.json({ success: true, count: 0 });
    }

    const queueItems = rows.map((row) => ({ to: row.mobile, message: row.message, type: 'text' }));
    const config = await getSettingsConfig();
    const results = await queueSend(config, queueItems);

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const result = results[i] || {};
      const isFailed = result.error || false;
      const newStatus = isFailed ? 'failed' : 'sent';
      const messageId = result?.messages?.[0]?.id || row.message_id || null;

      try {
        await db.execute(
          'UPDATE message_logs SET status = ?, response_data = ?, message_id = ?, updated_at = NOW() WHERE id = ?',
          [newStatus, JSON.stringify(result), messageId, row.id]
        );
      } catch (e) {
        const memIdx = memoryLogs.findIndex((m) => m.id === row.id);
        if (memIdx !== -1) {
          memoryLogs[memIdx].status = newStatus;
          memoryLogs[memIdx].message_id = messageId;
        }
      }
    }

    res.json({ success: true, count: rows.length, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getWebhookEvents = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.json([]);
  }
};

const getTemplatesEndpoint = async (req, res) => {
  try {
    const config = await getSettingsConfig();
    const { getTemplates } = require('../services/whatsappService');
    const templates = await getTemplates(config);
    res.json({ success: true, templates: templates.data || templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const webhook = async (req, res) => {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const config = await getSettingsConfig();
    const validTokens = new Set([
      config.WEBHOOK_VERIFY_TOKEN,
      process.env.WHATSAPP_VERIFY_TOKEN,
      'chitkote_webhook_secret_123',
      'chitkote_verify_token',
    ].filter(Boolean));

    if (mode === 'subscribe' && validTokens.has(token)) {
      return res.status(200).send(challenge);
    }
    if (!mode && !token) {
      return res.status(200).json({
        success: true,
        service: 'Chitkote Logistics WhatsApp Webhook',
        status: 'Active & Listening for Meta Events 🚀',
      });
    }
    return res.sendStatus(403);
  }

  const { entry } = req.body || {};
  if (Array.isArray(entry)) {
    for (const item of entry) {
      for (const change of item.changes || []) {
        const val = change.value;
        if (!val) continue;

        if (Array.isArray(val.statuses)) {
          for (const statusItem of val.statuses) {
            const status = statusItem.status || 'unknown';
            const messageId = statusItem.id || null;
            const recipient = statusItem.recipient_id || val.metadata?.display_phone_number || 'unknown';

            if (messageId) {
              const memIdx = memoryLogs.findIndex((m) => m.messageId === messageId || m.message_id === messageId || m.mobile === recipient);
              if (memIdx !== -1) {
                memoryLogs[memIdx].status = status;
                memoryLogs[memIdx].updated_at = new Date().toISOString();
              }
            }
          }
        }

        if (Array.isArray(val.messages)) {
          for (const msgItem of val.messages) {
            const msgId = msgItem.id || null;
            if (msgId && processedWebhookMessageIds.has(msgId)) {
              console.log(`[Webhook] Duplicate incoming message ID skipped: ${msgId}`);
              continue;
            }
            if (msgId) {
              processedWebhookMessageIds.add(msgId);
              if (processedWebhookMessageIds.size > 5000) {
                const oldestKeys = processedWebhookMessageIds.values();
                for (let k = 0; k < 1000; k++) {
                  const item = oldestKeys.next();
                  if (item.done) break;
                  processedWebhookMessageIds.delete(item.value);
                }
              }
            }
            const from = msgItem.from || 'unknown';
            const textBody = msgItem.text?.body || msgItem.button?.text || msgItem.interactive?.button_reply?.title || msgItem.type || 'Hi';
            const normalizedFrom = normalizePhone(from);

            if (normalizedFrom) {
              const inboundList = readFallbackInbound();
              const contactList = readFallbackContacts();
              const isAlreadySaved = contactList.some((c) => normalizePhone(c.mobile) === normalizedFrom);
              const senderName = val.contacts?.[0]?.profile?.name || `Driver (${normalizedFrom.slice(-10)})`;

              const inboundEntry = {
                id: msgId || Date.now(),
                msg_id: msgId || null,
                mobile: normalizedFrom,
                message: textBody,
                sender_name: senderName,
                is_saved: isAlreadySaved ? 1 : 0,
                created_at: new Date().toISOString(),
              };

              writeFallbackInbound([inboundEntry, ...inboundList]);
              try {
                await db.execute(
                  'INSERT INTO inbound_messages (mobile, message, sender_name, is_saved, created_at) VALUES (?, ?, ?, ?, ?)',
                  [inboundEntry.mobile, inboundEntry.message, inboundEntry.sender_name, inboundEntry.is_saved, inboundEntry.created_at]
                );
              } catch (e) {
                // DB write optional
              }

              // ===============================================
              // AUTO QUOTE DETECTION & LOAD NEGOTIATION LINKING
              // ===============================================
              const loads = readFallbackLoads();
              const loadMatch = textBody.match(/CK-\d+/i);
              const targetLoad = loadMatch
                ? loads.find((l) => String(l.load_id || l.loadId).toUpperCase() === loadMatch[0].toUpperCase())
                : loads[0];

              if (targetLoad) {
                const targetLoadId = targetLoad.load_id || targetLoad.loadId;

                // Detect numeric rate quote (e.g. "38000", "₹38,000", "38k", "38000 final")
                const rateMatch = textBody.match(/(?:₹|rs\.?|rate\s*:?\s*)?\s*(\d{2,3}(?:,\d{3})+|\d{4,6}|\d{2}\s*k)/i);
                if (rateMatch) {
                  let rawNumStr = rateMatch[1].toLowerCase().replace(/,/g, '').trim();
                  if (rawNumStr.endsWith('k')) {
                    rawNumStr = String(parseFloat(rawNumStr) * 1000);
                  }
                  const extractedRate = Number(rawNumStr);

                  if (!isNaN(extractedRate) && extractedRate >= 5000 && extractedRate <= 500000) {
                    const quoteObj = {
                      id: Date.now(),
                      load_id: targetLoadId,
                      transporter_mobile: normalizedFrom,
                      transporter_name: senderName,
                      offered_rate: extractedRate,
                      status: 'PENDING',
                      notes: `Auto-captured via WhatsApp: "${textBody}"`,
                      created_at: new Date().toISOString(),
                    };

                    try {
                      await db.execute(
                        `INSERT INTO load_negotiations (load_id, transporter_mobile, transporter_name, offered_rate, status, notes) VALUES (?, ?, ?, ?, ?, ?)`,
                        [quoteObj.load_id, quoteObj.transporter_mobile, quoteObj.transporter_name, quoteObj.offered_rate, quoteObj.status, quoteObj.notes]
                      );
                    } catch (negDbErr) {}

                    const { readFallbackNegotiations, writeFallbackNegotiations } = require('../utils/fileStore');
                    const fallbackNegs = readFallbackNegotiations();
                    writeFallbackNegotiations([quoteObj, ...fallbackNegs]);

                    console.log(`✓ Auto-captured Quote ₹${extractedRate} for Load ${targetLoadId} from ${normalizedFrom}`);
                  }
                }
              }
            }

            // Inbound message logging & quote detection complete. Auto-reply disabled to eliminate Service charges.
          }
        }
      }
    }
  }

  res.status(200).json({ success: true });
};


const getInboundMessages = async (req, res) => {
  const fallback = readFallbackInbound();
  try {
    const [rows] = await db.query('SELECT * FROM inbound_messages ORDER BY created_at DESC');
    const map = new Map();
    [...fallback, ...(rows || [])].forEach((item) => {
      const key = item.id || `${normalizePhone(item.mobile)}_${item.created_at}`;
      if (!map.has(key)) map.set(key, item);
    });
    res.json(Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.json(fallback);
  }
};

const saveInboundAsContact = async (req, res) => {
  const { id, mobile, name, company, city, state, vehicleType } = req.body;
  const normalizedMob = normalizePhone(mobile);
  if (!normalizedMob) {
    return res.status(400).json({ success: false, error: 'Mobile number is required' });
  }

  const fallbackContacts = readFallbackContacts();
  const existingIdx = fallbackContacts.findIndex((c) => normalizePhone(c.mobile) === normalizedMob);
  const contactObj = {
    id: Date.now(),
    name: name || `Driver (${normalizedMob.slice(-10)})`,
    mobile: normalizedMob,
    company: company || 'Verified Driver',
    city: city || 'Hyderabad',
    state: state || 'Telangana',
    vehicle_type: vehicleType || '32 FT Open Truck',
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    fallbackContacts[existingIdx] = contactObj;
  } else {
    fallbackContacts.unshift(contactObj);
  }
  writeFallbackContacts(fallbackContacts);

  const inboundList = readFallbackInbound();
  const nextInbound = inboundList.map((item) =>
    String(item.id) === String(id) || normalizePhone(item.mobile) === normalizedMob
      ? { ...item, is_saved: 1 }
      : item
  );
  writeFallbackInbound(nextInbound);

  try {
    await db.execute(
      'INSERT INTO contacts (name, mobile, company, city, state, vehicle_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [contactObj.name, contactObj.mobile, contactObj.company, contactObj.city, contactObj.state, contactObj.vehicle_type, 1]
    );
  } catch (dbErr) {
    // DB write optional
  }

  res.json({ success: true, contact: contactObj });
};

const getMessageDrafts = async (_req, res) => {
  const fallbackDrafts = readFallbackDrafts();
  try {
    const [rows] = await db.query('SELECT * FROM message_drafts ORDER BY updated_at DESC');
    res.json(rows && rows.length ? rows : fallbackDrafts);
  } catch (error) {
    res.json(fallbackDrafts);
  }
};

const saveMessageDraft = async (req, res) => {
  const { id, title, planType, planDate, greeting, language, selectedLoads, messageText, settings } = req.body;
  const draftId = id || Date.now();
  const draftObj = {
    id: draftId,
    title: title || `Draft ${new Date().toLocaleDateString('en-IN')}`,
    plan_type: planType || 'today',
    plan_date: planDate || '',
    greeting: greeting || 'Good Morning',
    language: language || 'en',
    selected_loads: selectedLoads || [],
    message_text: messageText || '',
    settings: settings || {},
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const fallbackDrafts = readFallbackDrafts();
  const existingIdx = fallbackDrafts.findIndex((d) => String(d.id) === String(draftId));
  if (existingIdx !== -1) {
    fallbackDrafts[existingIdx] = { ...fallbackDrafts[existingIdx], ...draftObj };
  } else {
    fallbackDrafts.unshift(draftObj);
  }
  writeFallbackDrafts(fallbackDrafts);

  try {
    await db.execute(
      `INSERT INTO message_drafts (id, title, plan_type, plan_date, greeting, language, selected_loads, message_text, settings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), plan_type = VALUES(plan_type), plan_date = VALUES(plan_date),
       greeting = VALUES(greeting), language = VALUES(language), selected_loads = VALUES(selected_loads),
       message_text = VALUES(message_text), settings = VALUES(settings), updated_at = NOW()`,
      [draftId, draftObj.title, draftObj.plan_type, draftObj.plan_date, draftObj.greeting, draftObj.language,
       JSON.stringify(draftObj.selected_loads), draftObj.message_text, JSON.stringify(draftObj.settings)]
    );
  } catch (dbErr) {
    // handled via fileStore
  }

  res.status(201).json({ success: true, draft: draftObj });
};

const deleteMessageDraft = async (req, res) => {
  const { id } = req.params;
  const idStr = String(id).trim();

  try {
    await db.execute('DELETE FROM message_drafts WHERE id = ?', [idStr]);
  } catch (dbErr) {}

  const fallbackDrafts = readFallbackDrafts();
  const nextDrafts = fallbackDrafts.filter((d) => String(d.id) !== idStr);
  writeFallbackDrafts(nextDrafts);

  res.json({ success: true, id: idStr });
};

module.exports = {
  getLoads,
  createLoad,
  updateLoad,
  deleteLoad,
  clearAllLoads,
  broadcastLoads,
  getSettings,
  getSettingsConfig,
  saveSettings,
  getMessageLogs,
  clearAllMessageHistory,
  retryFailedMessages,
  webhook,
  validateContactsEndpoint,
  sendTestMessage,
  getTemplatesEndpoint,
  getWebhookEvents,
  getInboundMessages,
  saveInboundAsContact,
  getMessageDrafts,
  saveMessageDraft,
  deleteMessageDraft,
};
