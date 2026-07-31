const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Get all 4 contacts
  const contactsRes = await axios.get(`${base}/contacts`);
  const allIds = (contactsRes.data || []).map(c => c.id);

  console.log('Targeting all contact IDs:', allIds);

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: allIds,
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.'
  });

  console.log('All 4 Contacts Broadcast Result:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
