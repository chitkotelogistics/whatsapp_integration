const db = require('../config/db');
const {
  readFallbackLoads,
  readFallbackTrips,
  writeFallbackTrips,
  readFallbackTimeline,
  writeFallbackTimeline,
  readFallbackParties,
  readFallbackTransporters,
  readFallbackDocuments,
  readFallbackTokens,
  writeFallbackTokens,
} = require('../utils/fileStore');
const {
  generateLoadingSlipHtml,
  generateCustomerInvoiceHtml,
  generateTransporterSettlementHtml,
  generateCommissionBillHtml,
} = require('../services/pdfService');
const { filterLoadCommercials } = require('./negotiationController');
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

// Log immutable activity to load_timeline
const logActivity = async (loadId, action, performedBy = 'CK Operations', role = 'CK_OPERATIONS', details = '') => {
  const entry = {
    id: Date.now(),
    load_id: loadId,
    action,
    performed_by: performedBy,
    user_role: role,
    details,
    created_at: new Date().toISOString(),
  };

  try {
    await db.execute(
      'INSERT INTO load_timeline (load_id, action, performed_by, user_role, details) VALUES (?, ?, ?, ?, ?)',
      [entry.load_id, entry.action, entry.performed_by, entry.user_role, entry.details]
    );
  } catch (e) {}

  const fallback = readFallbackTimeline();
  writeFallbackTimeline([entry, ...fallback]);
};

// ==========================================
// 1. TRIP DETAILS & LIFECYCLE WORKSPACE
// ==========================================

const getTripWorkspace = async (req, res) => {
  const { loadId } = req.params;
  const userRole = req.query.role || 'CK_OPERATIONS';

  const fallbackLoads = readFallbackLoads();
  const fallbackDocs = readFallbackDocuments();
  const fallbackTimeline = readFallbackTimeline();

  let loadObj = fallbackLoads.find(
    (l) => String(l.load_id || l.loadId) === String(loadId) || String(l.id) === String(loadId)
  );

  if (!loadObj) {
    try {
      const [rows] = await db.query('SELECT * FROM loads WHERE load_id = ? OR id = ?', [loadId, loadId]);
      if (rows.length > 0) loadObj = rows[0];
    } catch (e) {}
  }

  if (!loadObj) {
    return res.status(404).json({ success: false, error: 'Load not found' });
  }

  // Fetch documents for load
  let docs = fallbackDocs.filter((d) => String(d.load_id) === String(loadId));
  try {
    const [dRows] = await db.query('SELECT * FROM load_documents WHERE load_id = ?', [loadId]);
    if (dRows.length > 0) docs = dRows;
  } catch (e) {}

  // Fetch timeline for load
  let timeline = fallbackTimeline.filter((t) => String(t.load_id) === String(loadId));
  try {
    const [tRows] = await db.query('SELECT * FROM load_timeline WHERE load_id = ? ORDER BY created_at ASC', [loadId]);
    if (tRows.length > 0) timeline = tRows;
  } catch (e) {}

  // Sanitize rates based on requesting role
  const sanitizedLoad = filterLoadCommercials(loadObj, userRole);

  res.json({
    success: true,
    load: sanitizedLoad,
    documents: docs,
    timeline,
  });
};

// ==========================================
// 2. DOCUMENT GENERATION / PDF DOWNLOAD APIS
// ==========================================

const downloadDocumentPdf = async (req, res) => {
  const { loadId, docType } = req.params;

  const fallbackLoads = readFallbackLoads();
  const fallbackParties = readFallbackParties();
  const fallbackTransporters = readFallbackTransporters();

  const loadObj = fallbackLoads.find(
    (l) => String(l.load_id || l.loadId) === String(loadId) || String(l.id) === String(loadId)
  ) || { load_id: loadId };

  const partyObj = fallbackParties.find((p) => String(p.id) === String(loadObj.party_id)) || {};
  const transporterObj = fallbackTransporters.find((t) => String(t.id) === String(loadObj.transporter_id)) || {};

  let htmlContent = '';

  switch (docType) {
    case 'loading-slip':
      htmlContent = generateLoadingSlipHtml(loadObj);
      break;
    case 'customer-invoice':
      htmlContent = generateCustomerInvoiceHtml(loadObj, partyObj);
      break;
    case 'transporter-settlement':
      htmlContent = generateTransporterSettlementHtml(loadObj, transporterObj);
      break;
    case 'commission-bill':
      htmlContent = generateCommissionBillHtml(loadObj);
      break;
    default:
      return res.status(400).json({ success: false, error: 'Invalid document type requested' });
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
};

// ==========================================
// 3. PUBLIC CUSTOMER LIVE TRACKING PORTAL
// ==========================================

const getCustomerTrackingByToken = async (req, res) => {
  const { token } = req.params;
  const { resolveToken } = require('./documentPortalController');
  const tokenData = await resolveToken(token);

  if (!tokenData) {
    return res.status(404).json({ success: false, error: 'Invalid or expired tracking link' });
  }

  const loadId = tokenData.target_id;
  const fallbackLoads = readFallbackLoads();
  const fallbackTimeline = readFallbackTimeline();
  const fallbackDocs = readFallbackDocuments();

  const loadObj = fallbackLoads.find(
    (l) => String(l.load_id || l.loadId) === String(loadId) || String(l.id) === String(loadId)
  ) || {};

  const timeline = fallbackTimeline.filter((t) => String(t.load_id) === String(loadId));
  const podDoc = fallbackDocs.find((d) => String(d.load_id) === String(loadId) && d.doc_type === 'pod');

  // Customer view: strictly filter out transporter rate & margin
  const customerViewLoad = filterLoadCommercials(loadObj, 'PARTY');

  res.json({
    success: true,
    load: customerViewLoad,
    timeline,
    podAvailable: !!podDoc,
  });
};

// ==========================================
// 4. MULTI-RECIPIENT WHATSAPP NOTIFIER
// ==========================================

const notifyParticipants = async (req, res) => {
  const { loadId, eventType, customNotes } = req.body;

  const fallbackLoads = readFallbackLoads();
  const fallbackParties = readFallbackParties();
  const fallbackTransporters = readFallbackTransporters();

  const loadObj = fallbackLoads.find((l) => String(l.load_id || l.loadId) === String(loadId)) || {};
  const partyObj = fallbackParties.find((p) => String(p.id) === String(loadObj.party_id)) || {};
  const transporterObj = fallbackTransporters.find((t) => String(t.id) === String(loadObj.transporter_id)) || {};

  const partyMobile = normalizePhone(partyObj.mobile || loadObj.contact_number);
  const transporterMobile = normalizePhone(transporterObj.mobile);

  const notificationsSent = [];
  const config = await getSettingsConfig();

  // 1. Send update to Party/Customer (hides transporter rate)
  if (partyMobile) {
    const partyMsg = `🚛 *Chitkote Logistics Shipment Update*

Load ID: *${loadId}*
Route: *${loadObj.from_city || 'Hyderabad'} → ${loadObj.to_city || 'Chennai'}*
Current Status: *${eventType || loadObj.status}*

${customNotes ? `Notes: ${customNotes}\n` : ''}Track live status:
🔗 http://localhost:3000/portal/track/track_${loadId}`;

    try {
      await sendMessage(config, { to: partyMobile, message: partyMsg, type: 'text' });
      notificationsSent.push({ recipient: 'CUSTOMER', mobile: partyMobile });
    } catch (e) {}
  }

  // 2. Send update to Transporter (hides customer rate)
  if (transporterMobile) {
    const transporterMsg = `🚚 *Chitkote Logistics Transporter Notice*

Load ID: *${loadId}*
Vehicle: *${loadObj.vehicle_number || 'TS09AB1234'}*
Agreed Rate: *₹${loadObj.transporter_rate || 38000}*
Current Status: *${eventType || loadObj.status}*

${customNotes ? `Notes: ${customNotes}\n` : ''}Thank you for choosing Chitkote Logistics.`;

    try {
      await sendMessage(config, { to: transporterMobile, message: transporterMsg, type: 'text' });
      notificationsSent.push({ recipient: 'TRANSPORTER', mobile: transporterMobile });
    } catch (e) {}
  }

  await logActivity(loadId, `Notification Dispatched [${eventType}]`, 'CK Operations', 'CK_OPERATIONS', `Notified ${notificationsSent.length} participants via WhatsApp`);

  res.json({ success: true, count: notificationsSent.length, notificationsSent });
};

module.exports = {
  getTripWorkspace,
  downloadDocumentPdf,
  getCustomerTrackingByToken,
  notifyParticipants,
  logActivity,
};
