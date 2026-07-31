const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log('24-Hour session window is OPEN! Sending load broadcast...');

  // Get current contact ID for 9730361798
  const contactsRes = await axios.get(`${base}/contacts`);
  const contact = (contactsRes.data || []).find(c => c.mobile.includes('9730361798'));

  if (!contact) {
    console.error('Contact 9730361798 not found');
    return;
  }

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [contact.id],
    message: '🚛 LOAD AVAILABLE\n\nFROM : Chennai\nTO : Coimbatore\n\nMaterial : FMCG\nWeight : 8T\n\nVehicle :\nContainer 32FT\n\nLoading :\n2026-07-30\n\nFreight :\n24000\n\nContact :\nChitkote Logistics\n9441510824'
  });

  console.log('Session Window Broadcast Result:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Send error:', err.message);
  if (err.response) {
    console.error('Error data:', JSON.stringify(err.response.data, null, 2));
  }
});
