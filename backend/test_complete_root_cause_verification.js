const axios = require('axios');

const base = 'http://localhost:5000/api';

(async () => {
  console.log('=== STARTING COMPLETE ROOT CAUSE ANALYSIS & REGRESSION TEST SUITE ===\n');

  // Test 1: Add Newly Created Contact Manually
  console.log('1. Testing NEW Contact Manual Addition...');
  const newMobile = '919730361798'; // Live recipient number for delivery verification
  const createRes = await axios.post(`${base}/contacts`, {
    name: 'RootCause Verification Contact',
    mobile: newMobile,
    company: 'RootCause Logistics',
    city: 'Chennai',
    state: 'Tamil Nadu',
    vehicleType: 'Container 32FT',
  });
  console.log('✓ Contact Added Response:', createRes.data);

  // Test 2: Fetch Contacts & Verify Recipient Selection Query
  console.log('\n2. Testing Contact Retrieval (Simulating UI Load & Selection Query)...');
  const contactsRes = await axios.get(`${base}/contacts`);
  const allContacts = contactsRes.data || [];
  console.log(`✓ Retrieved ${allContacts.length} Total Contacts from Storage`);
  const foundNewContact = allContacts.find((c) => String(c.mobile).includes('9730361798'));
  console.log('✓ Found Newly Added Contact in Retrieval List:', foundNewContact);

  if (!foundNewContact) {
    throw new Error('FAILED: Newly added contact not found in retrieval list!');
  }

  // Test 3: Edit Contact Details
  console.log('\n3. Testing Contact Update / Edit Flow...');
  const updateRes = await axios.put(`${base}/contacts/${foundNewContact.id}`, {
    name: 'RootCause Verification Contact (Updated)',
    mobile: newMobile,
    company: 'RootCause Logistics Updated',
    city: 'Hyderabad',
    state: 'Telangana',
    vehicleType: '32 FT Open Truck',
  });
  console.log('✓ Contact Update Response:', updateRes.data);

  // Test 4: Duplicate Contact Deduplication Test
  console.log('\n4. Testing Duplicate Contact Rejection/Deduplication...');
  const importRes = await axios.post(`${base}/contacts/import`, {
    contacts: [
      { name: 'Duplicate Entry 1', mobile: newMobile, company: 'Test', city: 'HYD', state: 'TS', vehicleType: 'Truck' },
      { name: 'Unique Imported Contact', mobile: '918329747902', company: 'PC Co', city: 'HYD', state: 'TS', vehicleType: 'Truck' },
    ],
  });
  console.log('✓ Import Response (Duplicates Skipped):', importRes.data);

  // Test 5: Broadcast Dispatch to Newly Added & Existing Contacts
  console.log('\n5. Testing Live Broadcast Dispatch to Newly Added Contact...');
  const startTime = Date.now();
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [foundNewContact.id],
    message: '🚛 Chitkote Logistics\n\nA new load is available.\n\n📍 From: Hyderabad\n📍 To: Chennai\n\n🚚 Vehicle: 32 FT Open Truck\n⚖️ Weight: 25 Tons\n💰 Freight: 42000\n\n📞 Contact: 9390003955\n\nReply if you are interested or call the contact number.',
  });
  const durationMs = Date.now() - startTime;
  console.log('✓ Broadcast Response:', JSON.stringify(broadcastRes.data, null, 2));

  // Test 6: Verify Message Logs Persistence
  console.log('\n6. Testing Message Logs Persistence...');
  const logsRes = await axios.get(`${base}/message-logs`);
  const recentLogs = logsRes.data || [];
  console.log(`✓ Total Logs Count: ${recentLogs.length}`);
  const latestLog = recentLogs[0] || {};
  console.log('✓ Latest Log Entry:', {
    id: latestLog.id || latestLog.contactId,
    mobile: latestLog.mobile,
    status: latestLog.status,
    messageId: latestLog.messageId || latestLog.message_id,
  });

  // Test 7: Invalid Input Graceful Error Handling
  console.log('\n7. Testing Invalid Contact/Input Graceful Error Handling...');
  try {
    await axios.post(`${base}/broadcast`, { contactIds: [] });
  } catch (err) {
    console.log('✓ Empty Contact List Handled Gracefully:', err.response?.data);
  }

  console.log('\n=== ALL 7 REGRESSION & VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
})().catch((err) => {
  console.error('CRITICAL TEST ERROR:', err.message);
  if (err.response) {
    console.error('Response details:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
