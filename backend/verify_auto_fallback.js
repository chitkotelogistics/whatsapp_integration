const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('Testing automatic fallback logic with plain text load message...');
  const sendRes = await axios.post(`${base}/test-message`, {
    contacts: ['919390003955'],
    type: 'text',
    message: '🚛 LOAD AVAILABLE\n\nFROM : Bangalore\nTO : Hyderabad\n\nMaterial : Electrical Goods\nWeight : 15 Tons\n\nVehicle :\n32 FT Open Truck\n\nFreight :\n38000\n\nContact :\n9441510824'
  });

  console.log('API Result:', JSON.stringify(sendRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('Response:', err.response.data);
  }
});
