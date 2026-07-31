const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  const contactsRes = await axios.get(`${base}/contacts`);
  const allIds = (contactsRes.data || []).map(c => c.id);

  console.log('Testing UI Broadcast Simulation for IDs:', allIds);

  const res = await axios.post(`${base}/broadcast`, {
    contactIds: allIds,
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.'
  });

  console.log('UI Broadcast Simulation Result:');
  console.log(JSON.stringify(res.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
