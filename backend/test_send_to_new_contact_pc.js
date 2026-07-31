const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '918329747902'; // New contact "PC"

  console.log(`Sending load broadcast to newly added contact "PC" (${recipient})...`);

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'template',
    template: {
      name: 'load_notification',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Hyderabad' },
            { type: 'text', text: 'Chennai' },
            { type: 'text', text: '32 FT Open Truck' },
            { type: 'text', text: '25 Tons' },
            { type: 'text', text: '42000' },
            { type: 'text', text: '9390003955' }
          ]
        }
      ]
    }
  });

  console.log('Broadcast API Result for PC (8329747902):');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error sending to PC:', err.response?.data || err.message);
});
