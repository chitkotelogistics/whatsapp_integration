const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  const exactMessage = `🚛 Chitkote Logistics

A new load is available.

📍 From: Hyderabad
📍 To: Chennai

🚚 Vehicle: 32 FT Open Truck
⚖️ Weight: 25 Tons
💰 Freight: 42000

📞 Contact: 9441510824

Reply if you are interested or call the contact number.`;

  console.log(`Sending exact formatted message to ${recipient}...`);

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'text',
    message: exactMessage
  });

  console.log('API Response:', JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
