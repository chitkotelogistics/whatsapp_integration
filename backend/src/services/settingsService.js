const db = require('../config/db');
const { readFallbackSettings } = require('../utils/fileStore');

const getSettingsConfig = async () => {
  let row = {};
  const fallback = readFallbackSettings();

  try {
    const [rows] = await db.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    row = rows[0] || {};
  } catch (error) {
    row = {};
  }

  const phoneNumberId = row.phone_number_id || fallback.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessAccountId = row.business_account_id || fallback.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = row.access_token || fallback.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
  const webhookVerifyToken = row.webhook_verify_token || fallback.webhook_verify_token || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  const config = {
    API_BASE_URL: process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
    API_VERSION: process.env.WHATSAPP_API_VERSION || 'v25.0',
    PHONE_NUMBER_ID: phoneNumberId,
    BUSINESS_ACCOUNT_ID: businessAccountId,
    ACCESS_TOKEN: accessToken,
    WEBHOOK_VERIFY_TOKEN: webhookVerifyToken,
    webhook_verify_token: webhookVerifyToken,
    MAX_RETRIES: Number(process.env.MAX_RETRIES || 3),
    QUEUE_DELAY_MS: Number(process.env.QUEUE_DELAY_MS || 2000),
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('WhatsApp settings loaded:', {
      API_BASE_URL: config.API_BASE_URL,
      API_VERSION: config.API_VERSION,
      PHONE_NUMBER_ID: config.PHONE_NUMBER_ID,
      BUSINESS_ACCOUNT_ID: config.BUSINESS_ACCOUNT_ID,
      PHONE_NUMBER_ID_SET: !!config.PHONE_NUMBER_ID,
      ACCESS_TOKEN_SET: !!config.ACCESS_TOKEN,
    });
  }

  return config;
};

module.exports = { getSettingsConfig };