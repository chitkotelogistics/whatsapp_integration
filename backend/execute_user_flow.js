const axios = require('axios');
const db = require('./src/config/db');
const { writeFallbackContacts } = require('./src/utils/fileStore');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('--- Step 1: Deleting all existing contacts ---');
  try {
    await db.execute('DELETE FROM contacts');
  } catch (e) {
    console.log('DB clear warning:', e.message);
  }
  writeFallbackContacts([]);
  console.log('All contacts deleted from DB and contacts.json');

  console.log('\n--- Step 2: Adding single contact 9730361798 ---');
  const addRes = await axios.post(`${base}/contacts`, {
    name: 'Primary Recipient',
    mobile: '9730361798',
    company: 'Chitkote Logistics',
    city: 'Chennai',
    state: 'Tamil Nadu',
    vehicleType: 'Container 32FT'
  });
  console.log('Added Contact Response:', JSON.stringify(addRes.data, null, 2));

  const newContactId = addRes.data.id;

  console.log('\n--- Step 3: Fetching contacts list to verify UI state ---');
  const contactsList = await axios.get(`${base}/contacts`);
  console.log(`Current Total Contacts Count: ${contactsList.data.length}`);
  console.log('Contacts:', JSON.stringify(contactsList.data, null, 2));

  console.log('\n--- Step 4: Simulating UI Broadcast Send flow to contact 9730361798 ---');
  // First, fetch loads to attach
  const loadsRes = await axios.get(`${base}/loads`);
  const activeLoad = (loadsRes.data || [])[0];

  const broadcastPayload = {
    contactIds: [newContactId],
    message: activeLoad?.message || activeLoad?.message_body || '🚛 LOAD AVAILABLE\n\nFROM : Chennai\nTO : Coimbatore\n\nMaterial : FMCG\nWeight : 8T\n\nVehicle :\nContainer\n\nContact :\n9730361798',
  };

  const broadcastRes = await axios.post(`${base}/broadcast`, broadcastPayload);
  console.log('\n--- Step 5: Broadcast Send API Result ---');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Execution error:', err.message);
  if (err.response) {
    console.error('Error response:', JSON.stringify(err.response.data, null, 2));
  }
});
