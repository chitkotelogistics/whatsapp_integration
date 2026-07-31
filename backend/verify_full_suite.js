const axios = require('axios');

const base = 'http://localhost:5000/api';

(async () => {
  const health = await axios.get('http://localhost:5000/health');

  const importRes = await axios.post(`${base}/contacts/import`, {
    contacts: [
      { name: 'Suite Contact 1', mobile: '9390003955', company: 'Chitkote', city: 'Chennai', state: 'TN', vehicleType: 'Truck' },
      { name: 'Suite Contact 2', mobile: '9030003955', company: 'Chitkote', city: 'Chennai', state: 'TN', vehicleType: 'Truck' },
      { name: 'Suite Contact 1', mobile: '9390003955', company: 'Chitkote', city: 'Chennai', state: 'TN', vehicleType: 'Truck' },
    ],
  });

  const contacts = await axios.get(`${base}/contacts`);
  const groupRes = await axios.post(`${base}/groups`, {
    name: 'Suite Broadcast Group',
    contactIds: [1],
  });

  const groups = await axios.get(`${base}/groups`);
  const groupContacts = await axios.get(`${base}/groups/${groupRes.data.id}/contacts`);

  const loadRes = await axios.post(`${base}/loads`, {
    from: 'Chennai',
    to: 'Coimbatore',
    material: 'FMCG',
    weight: '8T',
    vehicleType: 'Container',
    loadingDate: '2026-07-23',
    freight: '18500',
    contactPerson: 'Suite Tester',
    contactNumber: '9730361798',
  });

  const testMessageRes = await axios.post(`${base}/test-message`, {
    contacts: ['9730361798'],
    message: 'Full-suite verification test message',
  });

  console.log(JSON.stringify({
    healthStatus: health.status,
    healthData: health.data,
    importStatus: importRes.status,
    importData: importRes.data,
    contactsStatus: contacts.status,
    contactsCount: Array.isArray(contacts.data) ? contacts.data.length : 0,
    groupStatus: groupRes.status,
    groupData: groupRes.data,
    groupsStatus: groups.status,
    groupsCount: Array.isArray(groups.data) ? groups.data.length : 0,
    groupContactsStatus: groupContacts.status,
    groupContactsData: groupContacts.data,
    loadStatus: loadRes.status,
    loadData: loadRes.data,
    testMessageStatus: testMessageRes.status,
    testMessageData: testMessageRes.data,
  }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify({
    status: err.response?.status || 'NO_STATUS',
    data: err.response?.data || { message: err.message },
  }, null, 2));
  process.exit(1);
});
