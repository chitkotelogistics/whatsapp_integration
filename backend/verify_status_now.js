const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('1. Checking API Server Health & Settings...');
  const settingsRes = await axios.get(`${base}/settings`);
  console.log('Settings Configuration Status:', {
    phone_number_id: settingsRes.data.phone_number_id,
    business_account_id: settingsRes.data.business_account_id,
    has_token: !!settingsRes.data.access_token
  });

  console.log('\n2. Testing Real WhatsApp Delivery to Customer...');
  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: ['919390003955'],
    type: 'template',
    template: {
      name: 'load_notification',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Chennai' },
            { type: 'text', text: 'Coimbatore' },
            { type: 'text', text: 'Container 32FT' },
            { type: 'text', text: '12T' },
            { type: 'text', text: '24000' },
            { type: 'text', text: '9441510824' }
          ]
        }
      ]
    }
  });

  console.log('\n3. Real-Time WhatsApp Message Send Result:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Verification failed:', err.message);
  if (err.response) {
    console.error('Error response:', JSON.stringify(err.response.data, null, 2));
  }
});
