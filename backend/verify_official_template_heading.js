const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798'; // User's number

  console.log('Sending official load_notification template to user number', recipient);

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1785231541477],
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
            { type: 'text', text: '9441510824' }
          ]
        }
      ]
    }
  });

  console.log('Official Template Send Response:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
