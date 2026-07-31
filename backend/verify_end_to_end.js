const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  const importRes = await axios.post(`${base}/contacts/import`, {
    contacts: [
      { name: 'CSV User 1', mobile: '9390003955', company: 'Chitkote', city: 'Chennai', state: 'TN', vehicleType: 'Truck' },
      { name: 'CSV User 2', mobile: '9030003955', company: 'Chitkote', city: 'Chennai', state: 'TN', vehicleType: 'Truck' },
    ],
  });

  const listContacts = await axios.get(`${base}/contacts`);
  const groupRes = await axios.post(`${base}/groups`, {
    name: 'CSV Broadcast Group',
    contactIds: [1],
  });

  const groups = await axios.get(`${base}/groups`);
  const groupContacts = await axios.get(`${base}/groups/${groupRes.data.id}/contacts`);

  console.log(JSON.stringify({
    importStatus: importRes.status,
    importData: importRes.data,
    contactsStatus: listContacts.status,
    contactsCount: Array.isArray(listContacts.data) ? listContacts.data.length : 0,
    groupStatus: groupRes.status,
    groupData: groupRes.data,
    groupsStatus: groups.status,
    groupsCount: Array.isArray(groups.data) ? groups.data.length : 0,
    groupContactsStatus: groupContacts.status,
    groupContactsData: groupContacts.data,
  }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify({
    status: err.response?.status || 'NO_STATUS',
    data: err.response?.data || { message: err.message },
  }, null, 2));
  process.exit(1);
});
