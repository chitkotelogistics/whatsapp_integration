const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const token = 'EAAW2Kf1eCwwBSCg6FhfZCrcSgRpl1IpjIqO70iODuIjEmjZAHZCNF7xjeRiZCdKQK0voFTQ1KF3Y4YFxXtWzWQWmMZCcgstzEMOuuP8R1iFu4gWbM0N141M8NTO9GU5wJ9OgurfPE2DMrorjWXVGKh3PG4JwpiO557ZCcpo0QtuPSTzwNeFAPYvu6A95qkAUrQ3Bf1MLG8EZB78oYfzoJO3PUCFhUrOjZBAx5qwb';

  // 1. Get current settings
  const getRes = await axios.get(`${base}/settings`);
  const current = getRes.data || {};

  // 2. Save settings with new access token
  const saveRes = await axios.post(`${base}/settings`, {
    phoneNumberId: '1198488923355389',
    businessAccountId: '1568445654798459',
    accessToken: token,
    webhookVerifyToken: current.webhook_verify_token || 'chitkote_webhook_secret_123'
  });

  // 3. Verify settings read back
  const updatedRes = await axios.get(`${base}/settings`);

  console.log(JSON.stringify({
    saveStatus: saveRes.status,
    phoneNumberId: updatedRes.data.phone_number_id,
    businessAccountId: updatedRes.data.business_account_id,
    accessTokenSet: !!updatedRes.data.access_token,
    tokenPreview: updatedRes.data.access_token ? updatedRes.data.access_token.slice(0, 15) + '...' : ''
  }, null, 2));
})().catch(err => {
  console.error('Error saving user token:', err.message);
  if (err.response) {
    console.error('Response data:', err.response.data);
  }
});
