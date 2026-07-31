const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log('Dispatched live broadcast to 919730361798...');

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1785231541477],
    message: '🚛 LOAD AVAILABLE - LIVE BROADCAST UPDATE\n\nFROM : Chennai\nTO : Hyderabad\n\nMaterial : FMCG\nWeight : 18 Tons\n\nVehicle : 32 FT Container\nFreight : 42000\n\nContact : Chitkote Logistics 9441510824'
  });

  console.log('Broadcast API Result:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
