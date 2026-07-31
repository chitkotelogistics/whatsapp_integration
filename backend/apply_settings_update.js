const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const getRes = await axios.get(`${base}/settings`);
  const current = getRes.data || {};

  const saveRes = await axios.post(`${base}/settings`, {
    phoneNumberId: '1198488923355389',
    businessAccountId: '1568445654798459',
    accessToken: current.access_token || process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: current.webhook_verify_token || 'chitkote_webhook_secret_123'
  });

  const updatedRes = await axios.get(`${base}/settings`);
  console.log(JSON.stringify(updatedRes.data, null, 2));
})().catch(err => {
  console.error('Error updating settings:', err.message);
});
