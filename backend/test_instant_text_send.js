const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log(`Sending instant text message to ${recipient}...`);

  const messageText = `🚛 Chitkote Logistics

A new load is available.

📍 From: Hyderabad
📍 To: Chennai

🚚 Vehicle: 32 FT Open Truck
⚖️ Weight: 25 Tons
💰 Freight: 42000

📞 Contact: Chitkote Logistics 9390003955

Reply if you are interested or call the contact number.`;

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'text',
    message: messageText
  });

  console.log('Instant Text Send Response:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
