const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('Testing broadcast load to external recipient who has NOT sent HI...');

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1785232135858], // Manjunathg (919390003955)
    message: '🚛 LOAD AVAILABLE\n\nFROM : Hyderabad\nTO : Vizag\n\nMaterial : Steel Pipe\nWeight : 22 Tons\n\nVehicle : 32 FT Open Truck\nFreight : 48000\n\nContact : 9441510824'
  });

  console.log('Broadcast API Result:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
