const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('1. Fetching contacts list...');
  const contactsRes = await axios.get(`${base}/contacts`);
  const contacts = contactsRes.data || [];
  const primaryContact = contacts.find(c => c.mobile.includes('9730361798'));

  if (!primaryContact) {
    console.error('Contact 9730361798 not found');
    return;
  }

  console.log('Primary Contact found:', primaryContact);

  console.log('\n2. Calling /api/broadcast with contactId for 9730361798...');
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [primaryContact.id],
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.'
  });

  console.log('\n3. UI Broadcast API Endpoint Response:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('UI Broadcast API Error:', err.message);
  if (err.response) {
    console.error('Error response data:', JSON.stringify(err.response.data, null, 2));
  }
});
