const db = require('../config/db');
const { initiateExotelCall, formatExotelPhone } = require('../services/voiceService');
const { readFallbackContacts } = require('../utils/fileStore');

const voiceCallLogs = [];

const persistVoiceLog = async (logPayload) => {
  const entry = {
    id: Date.now(),
    contactId: logPayload.contactId || null,
    mobile: logPayload.mobile,
    callSid: logPayload.callSid || null,
    status: logPayload.status || 'in-progress',
    direction: 'outbound-api',
    duration: logPayload.duration || null,
    loadDetails: logPayload.loadDetails || 'General Load Announcement',
    created_at: new Date().toISOString(),
  };

  try {
    await db.execute(
      'INSERT INTO voice_logs (contact_id, mobile, call_sid, status, direction, duration, load_details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.contactId, entry.mobile, entry.callSid, entry.status, entry.direction, entry.duration, entry.loadDetails]
    );
  } catch (err) {
    voiceCallLogs.unshift(entry);
    if (voiceCallLogs.length > 300) voiceCallLogs.length = 300;
  }

  return entry;
};

const makeCallToContact = async (req, res) => {
  try {
    const { contactId, mobile, appId, loadDetails, loadId } = req.body;

    let targetMobile = mobile;
    let targetContactId = contactId;

    if (!targetMobile && targetContactId) {
      try {
        const [rows] = await db.query('SELECT * FROM contacts WHERE id = ?', [targetContactId]);
        if (rows.length > 0) {
          targetMobile = rows[0].mobile;
        }
      } catch (e) {}

      if (!targetMobile) {
        const fallbackContacts = readFallbackContacts();
        const found = fallbackContacts.find((c) => String(c.id) === String(targetContactId));
        if (found) targetMobile = found.mobile;
      }
    }

    if (!targetMobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required for voice calling' });
    }

    const exotelResult = await initiateExotelCall(targetMobile, appId);
    const callData = exotelResult?.Call || {};

    const logEntry = await persistVoiceLog({
      contactId: targetContactId,
      mobile: formatExotelPhone(targetMobile),
      callSid: callData.Sid,
      status: callData.Status || 'in-progress',
      loadDetails: loadDetails || (loadId ? `Load ID: ${loadId}` : 'General Load Dispatch'),
    });

    res.json({
      success: true,
      message: `📞 Outbound automated call placed to ${targetMobile}`,
      callSid: callData.Sid,
      status: callData.Status,
      loadDetails: logEntry.loadDetails,
      log: logEntry,
    });
  } catch (error) {
    const errMsg = error.response?.data || error.message;
    res.status(500).json({ success: false, error: errMsg });
  }
};

const broadcastVoiceCalls = async (req, res) => {
  try {
    const { contactIds = [], appId, loadDetails, loadId } = req.body;

    if (!Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ success: false, error: 'No contacts selected for voice call broadcast' });
    }

    // Resolve contact IDs to real mobile numbers
    const strIds = new Set(contactIds.map((id) => String(id).trim()));
    const resolvedMobiles = new Set();
    const fallbackContacts = readFallbackContacts();

    // 1. Try DB lookup
    try {
      const [rows] = await db.query('SELECT id, mobile FROM contacts');
      for (const r of rows) {
        if (strIds.has(String(r.id)) || strIds.has(String(r.mobile))) {
          if (r.mobile) resolvedMobiles.add(r.mobile);
        }
      }
    } catch (e) {}

    // 2. Try Fallback fileStore lookup
    for (const fb of fallbackContacts) {
      if (strIds.has(String(fb.id)) || strIds.has(String(fb.mobile))) {
        if (fb.mobile) resolvedMobiles.add(fb.mobile);
      }
    }

    // 3. Include any raw direct phone numbers
    for (const item of contactIds) {
      const cleaned = String(item).replace(/\D/g, '');
      if (cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'))) {
        resolvedMobiles.add(item);
      }
    }

    const targetList = Array.from(resolvedMobiles);

    if (!targetList.length) {
      return res.status(400).json({ success: false, error: 'Selected contacts could not be resolved to valid mobile numbers' });
    }

    const results = [];
    const errors = [];

    const activeLoadText = loadDetails || (loadId ? `Load ID: ${loadId}` : 'General Load Dispatch');

    for (const targetMobile of targetList) {
      try {
        const exotelResult = await initiateExotelCall(targetMobile, appId);
        const callData = exotelResult?.Call || {};
        const logEntry = await persistVoiceLog({
          mobile: formatExotelPhone(targetMobile),
          callSid: callData.Sid,
          status: callData.Status || 'in-progress',
          loadDetails: activeLoadText,
        });
        results.push({ target: targetMobile, callSid: callData.Sid, status: callData.Status, log: logEntry });
      } catch (err) {
        const errDetail = err.response?.data?.RestException?.Message || err.message;
        errors.push({ target: targetMobile, error: errDetail });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    res.json({
      success: results.length > 0,
      total: targetList.length,
      successfulCalls: results.length,
      failedCalls: errors.length,
      loadDetails: activeLoadText,
      results,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getVoiceLogs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM voice_logs ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.json(voiceCallLogs);
  }
};

const exotelStatusWebhook = async (req, res) => {
  const { CallSid, Status, CallDuration } = req.body || req.query || {};

  if (CallSid) {
    try {
      await db.execute('UPDATE voice_logs SET status = ?, duration = ? WHERE call_sid = ?', [
        Status || 'completed',
        CallDuration || null,
        CallSid,
      ]);
    } catch (e) {}

    const mem = voiceCallLogs.find((m) => m.callSid === CallSid);
    if (mem) {
      mem.status = Status || 'completed';
      if (CallDuration) mem.duration = CallDuration;
    }
  }

  res.send('OK');
};

module.exports = {
  makeCallToContact,
  broadcastVoiceCalls,
  getVoiceLogs,
  exotelStatusWebhook,
};
