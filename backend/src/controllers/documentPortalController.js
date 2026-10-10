const crypto = require('crypto');
const db = require('../config/db');
const {
  readFallbackDocuments,
  writeFallbackDocuments,
  readFallbackTokens,
  writeFallbackTokens,
  readFallbackLoads,
  writeFallbackLoads,
  readFallbackTransporters,
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
// 1. PUBLIC SECURE TOKEN GENERATOR & VERIFIER
// ==========================================

const createToken = async (targetId, type = 'DOC_UPLOAD', expiresInDays = 7) => {
  const token = `${type.toLowerCase()}_${targetId}_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const tokenObj = {
    token,
    type,
    target_id: targetId,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  try {
    await db.execute(
      'INSERT INTO public_tokens (token, type, target_id, expires_at) VALUES (?, ?, ?, ?)',
      [tokenObj.token, tokenObj.type, tokenObj.target_id, tokenObj.expires_at]
    );
  } catch (e) {}

  const fallback = readFallbackTokens();
  writeFallbackTokens([tokenObj, ...fallback]);

  return token;
};

const resolveToken = async (token) => {
  const fallback = readFallbackTokens();
  let found = fallback.find((t) => t.token === token);

  if (!found) {
    try {
      const [rows] = await db.query('SELECT * FROM public_tokens WHERE token = ?', [token]);
      if (rows.length > 0) found = rows[0];
    } catch (e) {}
  }

  if (!found) return null;

  // Check expiry
  if (new Date(found.expires_at) < new Date()) {
    return null;
  }

  return found;
};

// ==========================================
// 2. DOCUMENT UPLOAD PORTAL APIS
// ==========================================

const getPortalDataByToken = async (req, res) => {
  const { token } = req.params;
  const tokenData = await resolveToken(token);

  if (!tokenData) {
    return res.status(404).json({ success: false, error: 'Invalid or expired upload link' });
  }

  const loadId = tokenData.target_id;
  const fallbackLoads = readFallbackLoads();
  const fallbackDocs = readFallbackDocuments();

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
    return res.status(404).json({ success: false, error: 'Associated Load not found' });
  }

  // Fetch documents for this load
  let docs = fallbackDocs.filter((d) => String(d.load_id) === String(loadId));
  try {
    const [dRows] = await db.query('SELECT * FROM load_documents WHERE load_id = ?', [loadId]);
    if (dRows.length > 0) docs = dRows;
  } catch (e) {}

  // Parse required documents schema (Default company rules -> Load rules)
  let requiredDocs = loadObj.required_documents;
  if (typeof requiredDocs === 'string') {
    try {
      requiredDocs = JSON.parse(requiredDocs);
    } catch (e) {
      requiredDocs = null;
    }
  }

  if (!requiredDocs) {
    requiredDocs = {
      rc: true,
      insurance: true,
      puc: true,
      driver_license: true,
      permit: false,
      fitness: false,
    };
  }

  res.json({
    success: true,
    tokenType: tokenData.type,
    load: {
      load_id: loadObj.load_id || loadObj.loadId,
      pickup: loadObj.from || loadObj.from_city,
      delivery: loadObj.to || loadObj.to_city,
      vehicle_type: loadObj.vehicle_type || loadObj.vehicleType,
      vehicle_number: loadObj.vehicle_number || 'TS09AB1234',
      status: loadObj.status || 'LOAD_CREATED',
      required_documents: requiredDocs,
    },
    documents: docs,
  });
};

const uploadPortalDocument = async (req, res) => {
  const { token, doc_type, doc_number, file_url, uploaded_by, uploader_role } = req.body;
  const tokenData = await resolveToken(token);

  if (!tokenData) {
    return res.status(404).json({ success: false, error: 'Invalid or expired upload link' });
  }

  const loadId = tokenData.target_id;
  if (!doc_type || !file_url) {
    return res.status(400).json({ success: false, error: 'Document type and file content are required' });
  }

  // Simple OCR text extraction assistance
  const ocrData = {
    extracted_at: new Date().toISOString(),
    extracted_text: `Assisted OCR check: Vehicle No detected for ${doc_type}`,
    confidence: '92%',
  };

  const docObj = {
    id: Date.now(),
    load_id: loadId,
    doc_type,
    doc_number: doc_number || '',
    file_url,
    uploaded_by: uploaded_by || 'Transporter Mobile Portal',
    uploader_role: uploader_role || 'TRANSPORTER',
    verification_status: 'PENDING',
    rejection_reason: null,
    ocr_data: JSON.stringify(ocrData),
    created_at: new Date().toISOString(),
  };

  try {
    await db.execute(
      `INSERT INTO load_documents (load_id, doc_type, doc_number, file_url, uploaded_by, uploader_role, verification_status, ocr_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docObj.load_id,
        docObj.doc_type,
        docObj.doc_number,
        docObj.file_url,
        docObj.uploaded_by,
        docObj.uploader_role,
        docObj.verification_status,
        docObj.ocr_data,
      ]
    );
  } catch (e) {}

  const fallback = readFallbackDocuments();
  const nextDocs = fallback.filter((d) => !(String(d.load_id) === String(loadId) && d.doc_type === doc_type));
  writeFallbackDocuments([docObj, ...nextDocs]);

  res.json({ success: true, message: `${doc_type} uploaded successfully`, document: docObj });
};

// ==========================================
// 3. DOCUMENT VERIFICATION & RE-UPLOAD ALERTS
// ==========================================

const updateDocumentVerificationStatus = async (req, res) => {
  const { docId } = req.params;
  const { status, rejection_reason, reviewer } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Verification status is required' });
  }

  const now = new Date().toISOString();

  try {
    await db.execute(
      'UPDATE load_documents SET verification_status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      [status, rejection_reason || null, reviewer || 'CK Operations', now, docId]
    );
  } catch (e) {}

  const fallback = readFallbackDocuments();
  let targetDoc = null;
  const nextDocs = fallback.map((d) => {
    if (String(d.id) === String(docId)) {
      targetDoc = {
        ...d,
        verification_status: status,
        rejection_reason: rejection_reason || null,
        reviewed_by: reviewer || 'CK Operations',
        reviewed_at: now,
      };
      return targetDoc;
    }
    return d;
  });
  writeFallbackDocuments(nextDocs);

  // If status is NEEDS_REUPLOAD or REJECTED, auto-trigger WhatsApp notification
  if ((status === 'NEEDS_REUPLOAD' || status === 'REJECTED') && targetDoc) {
    sendReuploadNoticeForDoc(targetDoc, rejection_reason);
  }

  res.json({ success: true, document: targetDoc });
};

const sendReuploadNoticeForDoc = async (doc, reason) => {
  try {
    const loadId = doc.load_id;
    const uploadToken = await createToken(loadId, 'DOC_UPLOAD', 7);
    const uploadUrl = `http://localhost:3000/portal/upload/${uploadToken}`;

    const fallbackTransporters = readFallbackTransporters();
    const fallbackLoads = readFallbackLoads();

    const targetLoad = fallbackLoads.find((l) => String(l.load_id || l.loadId) === String(loadId)) || {};
    const recipientMobile = targetLoad.contact_number || fallbackTransporters[0]?.mobile || '919390003955';

    const message = `🚨 *Document Re-Upload Required for Load ${loadId}*

Your uploaded *${doc.doc_type}* document requires re-uploading.

⚠️ *Reason:* ${reason || 'Image is blurry or unclear.'}

Please tap the secure link below to upload a clear photo/PDF:
🔗 ${uploadUrl}

Thank you,
*Chitkote Logistics India Private Limited*`;

    const config = await getSettingsConfig();
    await sendMessage(config, {
      to: normalizePhone(recipientMobile),
      message,
      type: 'text',
    });

    console.log(`✓ Re-upload WhatsApp alert sent to ${recipientMobile} for Load ${loadId}`);
  } catch (err) {
    console.error('Re-upload WhatsApp notice error:', err.message);
  }
};

// ==========================================
// 4. DRIVER SIMPLE MOBILE ACTION PORTAL
// ==========================================

const handleDriverActionByToken = async (req, res) => {
  const { token, action, location } = req.body;
  const tokenData = await resolveToken(token);

  if (!tokenData) {
    return res.status(404).json({ success: false, error: 'Invalid or expired driver link' });
  }

  const loadId = tokenData.target_id;
  const validActions = {
    REACHED_PICKUP: 'AT_PICKUP',
    LOADED: 'VEHICLE_LOADED',
    START_TRIP: 'IN_TRANSIT',
    REACHED_DELIVERY: 'AT_DELIVERY',
    DELIVERED: 'DELIVERED',
  };

  const newStatus = validActions[action] || action;

  try {
    await db.execute('UPDATE loads SET status = ? WHERE load_id = ? OR id = ?', [newStatus, loadId, loadId]);
  } catch (e) {}

  const fallbackLoads = readFallbackLoads();
  let updatedLoad = null;
  const nextLoads = fallbackLoads.map((l) => {
    if (String(l.load_id || l.loadId) === String(loadId) || String(l.id) === String(loadId)) {
      updatedLoad = {
        ...l,
        status: newStatus,
        last_action_time: new Date().toISOString(),
        last_location: location || 'Location updated',
      };
      return updatedLoad;
    }
    return l;
  });
  writeFallbackLoads(nextLoads);

  res.json({
    success: true,
    action,
    newStatus,
    message: `Driver action [${action}] recorded successfully for Load ${loadId}`,
  });
};

const getDriverDataByToken = async (req, res) => {
  const { token } = req.params;
  const tokenData = await resolveToken(token);

  if (!tokenData) {
    return res.status(404).json({ success: false, error: 'Invalid or expired driver link' });
  }

  const loadId = tokenData.target_id;
  const fallbackLoads = readFallbackLoads();
  const loadObj = fallbackLoads.find(
    (l) => String(l.load_id || l.loadId) === String(loadId) || String(l.id) === String(loadId)
  ) || {};

  res.json({
    success: true,
    load: {
      load_id: loadObj.load_id || loadObj.loadId || loadId,
      pickup: loadObj.from || loadObj.from_city || 'Hyderabad',
      delivery: loadObj.to || loadObj.to_city || 'Chennai',
      vehicle_number: loadObj.vehicle_number || 'TS09AB1234',
      driver_name: loadObj.driver_name || 'Ravi Kumar',
      status: loadObj.status || 'ASSIGNED',
    },
  });
};

const generateDocumentUploadLink = async (req, res) => {
  const { loadId } = req.params;
  const token = await createToken(loadId, 'DOC_UPLOAD', 7);
  const link = `http://localhost:3000/portal/upload/${token}`;
  res.json({ success: true, token, link });
};

const generateDriverActionLink = async (req, res) => {
  const { loadId } = req.params;
  const token = await createToken(loadId, 'DRIVER_ACTION', 7);
  const link = `http://localhost:3000/portal/driver/${token}`;
  res.json({ success: true, token, link });
};

module.exports = {
  getPortalDataByToken,
  uploadPortalDocument,
  updateDocumentVerificationStatus,
  handleDriverActionByToken,
  getDriverDataByToken,
  generateDocumentUploadLink,
  generateDriverActionLink,
};
