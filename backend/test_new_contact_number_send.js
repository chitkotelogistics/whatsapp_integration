const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log(`Sending load broadcast to ${recipient} with new contact number 9390003955...`);

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'text',
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: Chitkote Logistics 9390003955\n\nReply if you are interested or call the contact number.'
  });

  console.log('Send API Result:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
