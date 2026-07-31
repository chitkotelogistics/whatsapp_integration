const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const targetNumber = '9000003955';

  console.log('1. Adding contact manually:', targetNumber);
  const addRes = await axios.post(`${base}/contacts`, {
    name: 'Manual Test 9000003955',
    mobile: targetNumber,
    company: 'Test Company',
    city: 'Hyderabad',
    state: 'Telangana',
    vehicleType: '32 FT Open Truck'
  });

  console.log('Added Contact Result:', JSON.stringify(addRes.data, null, 2));
  const contactId = addRes.data.id;

  console.log('\n2. Sending Broadcast Load to contact:', targetNumber);
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [contactId],
    message: '🚛 LOAD AVAILABLE\n\nFROM : Hyderabad\nTO : Bangalore\n\nMaterial : Industrial Goods\nWeight : 20 Tons\n\nVehicle :\n32 FT Open Truck\n\nFreight :\n45000\n\nContact :\n9441510824'
  });

  console.log('\n3. Broadcast Response:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Response data:', JSON.stringify(err.response.data, null, 2));
  }
});
