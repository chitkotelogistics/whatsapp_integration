const db = require('../config/db');
const { generateLoadId, formatWhatsAppMessage } = require('../utils/helpers');
const { sendMessage, queueSend, validateContacts, buildLoadNotificationTemplate } = require('../services/whatsappService');
const { getSettingsConfig } = require('../services/settingsService');
const { readFallbackLoads, writeFallbackLoads, readFallbackContacts, writeFallbackContacts, readFallbackSettings, writeFallbackSettings, readFallbackLogs, writeFallbackLogs, readFallbackInbound, writeFallbackInbound } = require('../utils/fileStore');

const memoryLogs = [];

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
  const loadId = generateLoadId();
  const messageBody = formatWhatsAppMessage({ ...req.body, loadId });

  const loadObj = {
    id: Date.now(),
    loadId,
    message: messageBody,
    message_body: messageBody,
    from: req.body.from,
    from_city: req.body.from,
    to: req.body.to,
    to_city: req.body.to,
    material: req.body.material,
    weight: req.body.weight,
    vehicleType: req.body.vehicleType,
    vehicle_type: req.body.vehicleType,
    loadingDate: req.body.loadingDate,
    loading_date: req.body.loadingDate,
    freight: req.body.freight,
    contactPerson: req.body.contactPerson,
    contact_person: req.body.contactPerson,
    contactNumber: req.body.contactNumber,
    contact_number: req.body.contactNumber,
    created_at: new Date().toISOString(),
    fallback: true,
  };

  const fallbackLoads = readFallbackLoads();
  writeFallbackLoads([loadObj, ...fallbackLoads]);

  try {
    const [result] = await db.execute(
      'INSERT INTO loads (from_city, to_city, material, weight, vehicle_type, loading_date, freight, contact_person, contact_number, load_id, message_body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.body.from,
        req.body.to,
        req.body.material,
        req.body.weight,
        req.body.vehicleType,
        req.body.loadingDate,
        req.body.freight,
        req.body.contactPerson,
        req.body.contactNumber,
        loadId,
        messageBody,
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
  try {
    await db.execute(
      'UPDATE loads SET from_city = ?, to_city = ?, material = ?, weight = ?, vehicle_type = ?, loading_date = ?, freight = ?, contact_person = ?, contact_number = ?, message_body = ? WHERE id = ?',
      [
        req.body.from,
        req.body.to,
        req.body.material,
        req.body.weight,
        req.body.vehicleType,
        req.body.loadingDate,
        req.body.freight,
        req.body.contactPerson,
        req.body.contactNumber,
        req.body.message || formatWhatsAppMessage({ ...req.body, loadId: req.body.loadId }),
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

    const updated = {
      ...fallbackLoads[idx],
      from: req.body.from,
      to: req.body.to,
      material: req.body.material,
      weight: req.body.weight,
      vehicleType: req.body.vehicleType,
      loadingDate: req.body.loadingDate,
      freight: req.body.freight,
      contactPerson: req.body.contactPerson,
      contactNumber: req.body.contactNumber,
      message: req.body.message || formatWhatsAppMessage({ ...req.body, loadId: fallbackLoads[idx].loadId }),
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
    const { contactIds, message, type = 'text', scheduledAt, mediaUrl, caption, template } = req.body;

    if (!Array.isArray(contactIds) || !contactIds.length) {
      return res.status(400).json({ success: false, error: 'No contacts selected for broadcast' });
    }

    const contacts = await getContactsByIds(contactIds);

    if (!contacts.length) {
      return res.status(400).json({ success: false, error: 'Selected contacts not found' });
    }

    const queuedMessage = message || 'Hello from Chitkote Logistics';

    const queueItems = contacts.map((contact) => ({
      to: contact.mobile,
      message: queuedMessage,
      type: 'template',
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
            const from = msgItem.from || 'unknown';
            const textBody = msgItem.text?.body || msgItem.button?.text || msgItem.interactive?.button_reply?.title || msgItem.type || 'Hi';
            const normalizedFrom = normalizePhone(from);

            if (normalizedFrom) {
              const inboundList = readFallbackInbound();
              const contactList = readFallbackContacts();
              const isAlreadySaved = contactList.some((c) => normalizePhone(c.mobile) === normalizedFrom);

              const inboundEntry = {
                id: Date.now(),
                mobile: normalizedFrom,
                message: textBody,
                sender_name: val.contacts?.[0]?.profile?.name || `Driver (${normalizedFrom.slice(-10)})`,
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
            }

            try {
              const config = await getSettingsConfig();
              const loads = readFallbackLoads();
              const latestLoad = loads[0] || {};
              const replyText = `🚛 Welcome to Chitkote Logistics!

Hello! Thank you for reaching out to Chitkote Logistics India Private Limited. 

We have received your message. Our team will share suitable load details with you shortly.

📞 For urgent load inquiries, please call us directly at 9390003955.`;

              const replyResult = await sendMessage(config, {
                to: normalizedFrom,
                message: replyText,
                type: 'text',
              });

              console.log(`✓ Instant Auto-Reply delivered to ${normalizedFrom}:`, replyResult?.messages?.[0]?.id || 'delivered');
              await persistMessageLog({
                contactId: null,
                mobile: normalizedFrom,
                message: replyText,
                status: 'sent',
                responseData: JSON.stringify(replyResult),
                messageId: replyResult?.messages?.[0]?.id || null,
              });
            } catch (autoReplyErr) {
              console.error('Auto-reply error:', autoReplyErr.message);
            }
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

module.exports = {
  getLoads,
  createLoad,
  updateLoad,
  deleteLoad,
  clearAllLoads,
  broadcastLoads,
  getSettings,
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
};
