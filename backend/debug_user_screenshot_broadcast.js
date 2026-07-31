const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Get contacts list
  const contactsRes = await axios.get(`${base}/contacts`);
  const contacts = contactsRes.data || [];
  const selectedIds = contacts.slice(0, 2).map(c => c.id);

  console.log('Selected contact IDs:', selectedIds);
  console.log('Selected contacts:', contacts.slice(0, 2).map(c => ({ id: c.id, mobile: c.mobile })));

  // 2. Exact message text from user screenshot
  const screenshotMessage = '🚛 LOAD AVAILABLE\n\nFROM : Chennai\nTO : Coimbatore';

  console.log('\nSending broadcast with message text from screenshot...');
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: selectedIds,
    message: screenshotMessage
  });

  console.log('\nBroadcast Response:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error during broadcast:', err.message);
  if (err.response) {
    console.error('Response details:', JSON.stringify(err.response.data, null, 2));
  }
});
