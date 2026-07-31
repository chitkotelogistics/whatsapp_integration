const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log(`Sending load broadcast with sanitized parameters to ${recipient}...`);

  const sendRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1785231541477],
    message: '🚛 LOAD AVAILABLE\n\nFROM : Hyderabad\nTO : Chennai\n\nMaterial : FMCG\nWeight : 15 Tons\n\nVehicle :\n32 FT Container\n\nFreight :\n35000\n\nContact :\n9441510824'
  });

  console.log('Sanitized Send API Response:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
