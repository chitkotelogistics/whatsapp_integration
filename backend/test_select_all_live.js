const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('1. Fetching all available contacts (Simulating "Select All" click)...');
  const contactsRes = await axios.get(`${base}/contacts`);
  const allContacts = contactsRes.data || [];
  const allIds = allContacts.map((c) => c.id);

  console.log(`Total Contacts Selected: ${allContacts.length}`);
  console.log('Selected Contacts:', allContacts.map((c) => ({ id: c.id, name: c.name, mobile: c.mobile })));

  const broadcastPayload = {
    contactIds: allIds,
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.',
  };

  console.log('\n2. Dispatching Broadcast to ALL Selected Contacts via Meta Cloud API...');
  const startTime = Date.now();
  const broadcastRes = await axios.post(`${base}/broadcast`, broadcastPayload);
  const durationMs = Date.now() - startTime;

  console.log('\n3. Real-Time Broadcast Results (Select All Flow):');
  console.log(JSON.stringify({
    success: broadcastRes.data.success,
    totalSelected: broadcastRes.data.total,
    sentCount: broadcastRes.data.sentCount,
    failedCount: broadcastRes.data.failedCount,
    executionTimeMs: durationMs,
    recipients: broadcastRes.data.results.map((r, i) => ({
      contactNumber: allContacts[i]?.mobile || r.contacts?.[0]?.input || 'unknown',
      status: r.error ? 'FAILED' : 'ACCEPTED BY META',
      metaMessageId: r.messages?.[0]?.id || null,
      errorReason: r.message || null
    }))
  }, null, 2));
})().catch((err) => {
  console.error('Test execution error:', err.message);
  if (err.response) {
    console.error('Error details:', JSON.stringify(err.response.data, null, 2));
  }
});
