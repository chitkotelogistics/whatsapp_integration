const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const logsRes = await axios.get(`${base}/message-logs`);
  console.log('Most Recent Message Logs:');
  console.log(JSON.stringify((logsRes.data || []).slice(0, 5), null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
