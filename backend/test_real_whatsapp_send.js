const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('Sending test message to contact 919441510824...');
  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: ['919441510824'],
    message: '🚛 Chitkote Logistics WhatsApp Cloud API Connection Test. System is live!'
  });

  console.log('API Response:', JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Send error:', err.message);
  if (err.response) {
    console.error('Response data:', JSON.stringify(err.response.data, null, 2));
  }
});
