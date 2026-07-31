const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log('Sending live text message to 9730361798...');

  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: [recipient],
    type: 'text',
    message: '🚛 LOAD AVAILABLE - LIVE TEST\n\nFROM : Hyderabad\nTO : Chennai\n\nMaterial : FMCG Goods\nWeight : 15 Tons\n\nVehicle : Container 32FT\nFreight : 35000\n\nContact : 9441510824'
  });

  console.log('Text Message Send Response:');
  console.log(JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Send error:', err.message);
});
