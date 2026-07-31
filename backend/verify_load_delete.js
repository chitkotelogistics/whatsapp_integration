const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Create temporary load
  const loadRes = await axios.post(`${base}/loads`, {
    from: 'Pune',
    to: 'Bangalore',
    material: 'Auto Parts',
    weight: '14T',
    vehicleType: '32FT MX',
    loadingDate: '2026-07-30',
    freight: '42000',
    contactPerson: 'Load Tester',
    contactNumber: '9730361798'
  });

  const loadId = loadRes.data.loadId;

  // 2. Get list of loads
  const listRes = await axios.get(`${base}/loads`);
  const foundLoad = listRes.data.find(l => l.loadId === loadId || l.load_id === loadId);

  let deleteRes = { status: 0 };
  if (foundLoad) {
    deleteRes = await axios.delete(`${base}/loads/${foundLoad.id || foundLoad.loadId}`);
  }

  console.log(JSON.stringify({
    createStatus: loadRes.status,
    loadId,
    foundLoadId: foundLoad ? (foundLoad.id || foundLoad.loadId) : null,
    deleteStatus: deleteRes.status,
    deleteData: deleteRes.data
  }, null, 2));
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
