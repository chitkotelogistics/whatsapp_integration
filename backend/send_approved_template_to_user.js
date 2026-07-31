const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log(`Sending approved Meta template load_notification to ${recipient}...`);

  const templatePayload = {
    name: 'load_notification',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Chennai' },
          { type: 'text', text: 'Coimbatore' },
          { type: 'text', text: '32 FT Container' },
          { type: 'text', text: '10 Tons' },
          { type: 'text', text: '22000' },
          { type: 'text', text: '9441510824' }
        ]
      }
    ]
  };

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'template',
    template: templatePayload
  });

  console.log('Template Send API Result:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Send error:', err.message);
  if (err.response) {
    console.error('Error data:', JSON.stringify(err.response.data, null, 2));
  }
});
