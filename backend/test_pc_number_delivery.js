const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '918329747902';

  console.log(`1. Testing INSTANT TEXT send to PC (${recipient})...`);
  try {
    const textRes = await axios.post(`${base}/test-message`, {
      contacts: [recipient],
      type: 'text',
      message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.'
    });
    console.log('Instant Text Send Response for PC:', JSON.stringify(textRes.data, null, 2));
  } catch (err) {
    console.error('Text send failed:', err.response?.data || err.message);
  }

  console.log(`\n2. Testing TEMPLATE send to PC (${recipient})...`);
  try {
    const templateRes = await axios.post(`${base}/test-message`, {
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
    console.log('Template Send Response for PC:', JSON.stringify(templateRes.data, null, 2));
  } catch (err) {
    console.error('Template send failed:', err.response?.data || err.message);
  }
})().catch(err => {
  console.error('Fatal error:', err.message);
});
