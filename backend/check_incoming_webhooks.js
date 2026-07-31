const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  try {
    const res = await axios.get(`${base}/webhook-events`);
    console.log('Recent Incoming Webhook Events (HI messages from users):');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error getting webhooks:', err.message);
  }
})().catch(err => {
  console.error('Error:', err.message);
});
