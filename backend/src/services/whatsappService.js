const axios = require('axios');

const normalizeWhatsAppNumber = (value = '') => {
  let cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('9191')) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }

  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return `91${cleaned.slice(1)}`;
  }

  return cleaned;
};

const getConfig = (config = {}) => {
  const API_BASE_URL = config.API_BASE_URL || process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
  const API_VERSION = config.API_VERSION || process.env.WHATSAPP_API_VERSION || 'v25.0';
  const PHONE_NUMBER_ID = config.PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = config.ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const MAX_RETRIES = Number(config.MAX_RETRIES || process.env.MAX_RETRIES || 3);
  const QUEUE_DELAY_MS = Number(config.QUEUE_DELAY_MS || process.env.QUEUE_DELAY_MS || 50);

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('Missing WhatsApp configuration: PHONE_NUMBER_ID or ACCESS_TOKEN');
  }

  return { API_BASE_URL, API_VERSION, PHONE_NUMBER_ID, ACCESS_TOKEN, MAX_RETRIES, QUEUE_DELAY_MS };
};

const buildLoadNotificationTemplate = (messageText = '', templateName = 'load_dispatch') => {
  const text = String(messageText || '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const fromMatch = text.match(/(?:From|FROM)\s*:\s*([^\n]+)/i);
  const toMatch = text.match(/(?:To|TO)\s*:\s*([^\n]+)/i);
  const weightMatch = text.match(/(?:Weight|WEIGHT)\s*:\s*([^\n]+)/i);
  const vehicleMatch = text.match(/(?:Vehicle|VEHICLE)\s*:\s*([^\n]+)/i);
  const freightMatch = text.match(/(?:Freight|FREIGHT)\s*:\s*([^\n]+)/i);
  const contactMatch = text.match(/(?:Contact|CONTACT)\s*:\s*([^\n]+)/i);
  const phoneDigitsMatch = text.match(/\b(?:91)?[6-9]\d{9}\b/);

  let from = fromMatch ? fromMatch[1].trim() : 'Hyderabad';
  let to = toMatch ? toMatch[1].trim() : 'Chennai';
  let vehicle = vehicleMatch ? vehicleMatch[1].trim() : '32 FT Open Truck';
  let weight = weightMatch ? weightMatch[1].trim() : '25 Tons';
  let freight = freightMatch ? freightMatch[1].trim() : '42000';
  let contact = contactMatch ? contactMatch[1].replace(/\D/g, '').slice(-10) : (phoneDigitsMatch ? phoneDigitsMatch[0].replace(/\D/g, '').slice(-10) : '9390003955');

  from = from.replace(/[^\w\s\.-]/gi, '').trim().slice(0, 30) || 'Hyderabad';
  to = to.replace(/[^\w\s\.-]/gi, '').trim().slice(0, 30) || 'Chennai';
  vehicle = vehicle.replace(/[^\w\s\.-]/gi, '').trim().slice(0, 30) || '32 FT Open Truck';
  weight = weight.replace(/[^\w\s\.-]/gi, '').trim().slice(0, 20) || '25 Tons';
  freight = freight.replace(/[^\w\s\.-]/gi, '').trim().slice(0, 20) || '42000';
  contact = contact.slice(-10) || '9390003955';

  const name = templateName || 'load_dispatch';
  return {
    name,
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: from },
          { type: 'text', text: to },
          { type: 'text', text: vehicle },
          { type: 'text', text: weight },
          { type: 'text', text: freight },
          { type: 'text', text: contact },
        ],
      },
    ],
  };
};

const buildPayload = ({ to, message, type = 'text', mediaUrl, caption, template }) => {
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizeWhatsAppNumber(to),
  };

  if (type === 'template' && template) {
    payload.type = 'template';
    payload.template = template;
  } else if (type === 'image') {
    payload.type = 'image';
    payload.image = { link: mediaUrl, caption };
  } else if (type === 'document') {
    payload.type = 'document';
    payload.document = { link: mediaUrl, caption };
  } else {
    payload.type = 'text';
    payload.text = { body: message || 'Hello from Chitkote Logistics' };
  }

  return payload;
};

const sendMessage = async (config = {}, { to, message, type = 'text', mediaUrl, caption, template }) => {
  const { API_BASE_URL, API_VERSION, PHONE_NUMBER_ID, ACCESS_TOKEN, MAX_RETRIES } = getConfig(config);
  let payload = buildPayload({ to, message, type, mediaUrl, caption, template });

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.post(`${API_BASE_URL}/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      attempt += 1;
      const status = error.response?.status;
      const errorData = error.response?.data || {};

      if (status === 400 && payload.type === 'text') {
        console.log('Text send returned 400. Automatically falling back to approved load_notification template...');
        payload = {
          messaging_product: 'whatsapp',
          to: normalizeWhatsAppNumber(to),
          type: 'template',
          template: buildLoadNotificationTemplate(message),
        };
        continue;
      }

      console.error('WhatsApp sendMessage failed:', {
        attempt,
        status,
        to,
        payload,
        errorMessage: error.message,
        responseData: errorData,
      });

      if ([401, 403, 429, 500].includes(status) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
      throw error;
    }
  }
};

const validateContacts = async (config = {}, contacts = []) => {
  if (!contacts.length) {
    throw new Error('No contacts provided for validation');
  }

  const normalizedContacts = contacts.map((contact) => normalizeWhatsAppNumber(contact));
  const { API_BASE_URL, API_VERSION, PHONE_NUMBER_ID, ACCESS_TOKEN } = getConfig(config);
  const payload = { blocking: 'wait', contacts: normalizedContacts };
  const response = await axios.post(`${API_BASE_URL}/${API_VERSION}/${PHONE_NUMBER_ID}/contacts`, payload, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

const queueSend = async (config = {}, items = []) => {
  const results = [];
  const delayMs = Number(config.QUEUE_DELAY_MS || 500);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    try {
      const res = await sendMessage(config, item);
      results.push(res);
    } catch (error) {
      const metaError = error.response?.data?.error;
      const detailedMessage = metaError?.message || metaError?.error_data?.details || error.message;
      results.push({
        error: true,
        message: detailedMessage,
        code: metaError?.code || null,
        type: metaError?.type || null,
        status: error.response?.status || 500,
        responseData: error.response?.data || null,
      });
    }

    if (i < items.length - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

const getTemplates = async (config = {}) => {
  const { API_BASE_URL, API_VERSION, ACCESS_TOKEN } = getConfig(config);
  const businessAccountId = config.BUSINESS_ACCOUNT_ID || config.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!businessAccountId) {
    throw new Error('Missing BUSINESS_ACCOUNT_ID for template retrieval');
  }

  const response = await axios.get(`${API_BASE_URL}/${API_VERSION}/${businessAccountId}/message_templates`, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });

  return response.data;
};

module.exports = { sendMessage, queueSend, validateContacts, getTemplates, buildLoadNotificationTemplate };
