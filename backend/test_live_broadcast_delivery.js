const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const recipient = '919730361798';

  console.log('Dispatched live broadcast to 919730361798...');

  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1785231541477],
    message: '*🚚 Chitkote Logistics Load Available*\n\n*📍 Pickup City:* Chennai\n*📍 Delivery City:* Hyderabad\n*🚚 Vehicle Type Required:* 32 FT Container\n*⚖️ Shipment Weight:* 18 Tons\n*💰 Agreed Freight Rate:* 42000\n*📞 Direct Contact Phone:* 9441510824\n\nPlease call or reply to this message if you are available to accept this load.'
  });

  console.log('Broadcast API Result:');
  console.log(JSON.stringify(broadcastRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
