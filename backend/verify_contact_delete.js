const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Create temporary contact
  const createRes = await axios.post(`${base}/contacts`, {
    name: 'Delete Test Contact',
    mobile: '9999999999',
    city: 'Mumbai',
    state: 'MH',
    vehicleType: 'Trailer'
  });

  const createdId = createRes.data.id;

  // 2. Delete the created contact
  const deleteRes = await axios.delete(`${base}/contacts/${createdId}`);

  // 3. Import two contacts for bulk delete
  const importRes = await axios.post(`${base}/contacts/import`, {
    contacts: [
      { name: 'Bulk Del 1', mobile: '9888888881', city: 'Delhi', state: 'DL', vehicleType: 'LPT' },
      { name: 'Bulk Del 2', mobile: '9888888882', city: 'Delhi', state: 'DL', vehicleType: 'LPT' }
    ]
  });

  const allContacts = await axios.get(`${base}/contacts`);
  const del1 = allContacts.data.find(c => c.mobile === '919888888881');
  const del2 = allContacts.data.find(c => c.mobile === '919888888882');

  let bulkRes = { status: 0 };
  if (del1 && del2) {
    bulkRes = await axios.post(`${base}/contacts/delete-bulk`, { ids: [del1.id, del2.id] });
  }

  console.log(JSON.stringify({
    createStatus: createRes.status,
    createdId,
    deleteStatus: deleteRes.status,
    deleteData: deleteRes.data,
    bulkDeleteStatus: bulkRes.status,
    bulkDeleteData: bulkRes.data
  }, null, 2));
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
