const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  const recipient = '919390003955'; // Number from Meta template example
  console.log(`Sending approved load_notification template to recipient ${recipient}...`);

  const templatePayload = {
    name: 'load_notification',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Chennai' },
          { type: 'text', text: 'Coimbatore' },
          { type: 'text', text: 'Container' },
          { type: 'text', text: '8T' },
          { type: 'text', text: '18500' },
          { type: 'text', text: '9441510824' }
        ]
      }
    ]
  };

  try {
    const sendRes = await axios.post(`${base}/test-message`, {
      contacts: [recipient],
      type: 'template',
      template: templatePayload
    });

    console.log('Real WhatsApp Send Response:', JSON.stringify(sendRes.data, null, 2));
  } catch (err) {
    console.error('Send error:', err.response?.data || err.message);
  }
})().catch(err => {
  console.error('Unexpected error:', err.message);
});
