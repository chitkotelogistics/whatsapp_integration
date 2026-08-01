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
    created_at: new Date().toISOString(),
  };

  try {
    await db.execute(
      'INSERT INTO voice_logs (contact_id, mobile, call_sid, status, direction, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [entry.contactId, entry.mobile, entry.callSid, entry.status, entry.direction, entry.duration]
    );
  } catch (err) {
    voiceCallLogs.unshift(entry);
    if (voiceCallLogs.length > 300) voiceCallLogs.length = 300;
  }

  return entry;
};

const makeCallToContact = async (req, res) => {
  try {
    const { contactId, mobile, appId } = req.body;

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
    });

    res.json({
      success: true,
      message: `📞 Outbound automated call placed to ${targetMobile}`,
      callSid: callData.Sid,
      status: callData.Status,
      log: logEntry,
    });
  } catch (error) {
    const errMsg = error.response?.data || error.message;
    res.status(500).json({ success: false, error: errMsg });
  }
};

const broadcastVoiceCalls = async (req, res) => {
  try {
    const { contactIds = [], appId } = req.body;

    if (!Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ success: false, error: 'No contacts selected for voice call broadcast' });
    }

    const results = [];
    const errors = [];

    for (const item of contactIds) {
      try {
        const exotelResult = await initiateExotelCall(item, appId);
        const callData = exotelResult?.Call || {};
        const logEntry = await persistVoiceLog({
          contactId: item,
          mobile: formatExotelPhone(item),
          callSid: callData.Sid,
          status: callData.Status || 'in-progress',
        });
        results.push({ target: item, callSid: callData.Sid, status: callData.Status, log: logEntry });
      } catch (err) {
        errors.push({ target: item, error: err.message });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    res.json({
      success: results.length > 0,
      total: contactIds.length,
      successfulCalls: results.length,
      failedCalls: errors.length,
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
