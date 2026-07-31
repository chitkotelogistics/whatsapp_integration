const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // Add new contact who has NEVER messaged the business before
  const newContactRes = await axios.post(`${base}/contacts`, {
    name: 'New Driver Outside Window',
    mobile: '9888877777',
    city: 'Hyderabad',
    state: 'Telangana',
    vehicleType: '32 FT Open Truck'
  });

  const contactId = newContactRes.data.id;
  console.log('Added new contact:', newContactRes.data);

  // Send load broadcast via API
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [contactId],
    message: '🚛 LOAD AVAILABLE\n\nFROM : Hyderabad\nTO : Chennai\n\nMaterial : Steel\nWeight : 25 Tons\n\nVehicle :\n32 FT Open Truck\n\nFreight :\n42000\n\nContact :\n9441510824'
  });

  console.log('\nBroadcast result to new contact:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Response data:', err.response.data);
  }
});
