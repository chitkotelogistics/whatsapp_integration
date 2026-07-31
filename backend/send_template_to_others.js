const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const otherNumbers = ['919390003955', '919888877777'];

  for (const num of otherNumbers) {
    console.log(`Sending approved Meta template load_notification to external number ${num}...`);

    try {
      const sendRes = await axios.post(`${base}/test-message`, {
        contacts: [num],
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

      console.log(`Result for ${num}:`, JSON.stringify(sendRes.data, null, 2));
    } catch (e) {
      console.error(`Error for ${num}:`, e.response?.data || e.message);
    }
  }
})().catch(err => {
  console.error('Error:', err.message);
});
