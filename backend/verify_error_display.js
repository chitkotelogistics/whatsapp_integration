const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Send test broadcast to check response structure
  const broadcastRes = await axios.post(`${base}/broadcast`, {
    contactIds: [1],
    message: 'Test Error Diagnostic Message'
  });

  console.log(JSON.stringify({
    status: broadcastRes.status,
    data: broadcastRes.data
  }, null, 2));
})().catch((err) => {
  if (err.response) {
    console.log(JSON.stringify({
      status: err.response.status,
      data: err.response.data
    }, null, 2));
  } else {
    console.error('Error:', err.message);
  }
});
