const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Query webhook events
  const eventsRes = await axios.get(`${base}/webhook-events`);

  // 2. Query message logs
  const logsRes = await axios.get(`${base}/message-logs`);

  // 3. Test targeted retry endpoint with specific log ID
  const firstLog = (logsRes.data || [])[0];
  let retryRes = { status: 0 };
  if (firstLog) {
    retryRes = await axios.post(`${base}/retry-failed`, { id: firstLog.id });
  }

  console.log(JSON.stringify({
    eventsStatus: eventsRes.status,
    eventsCount: Array.isArray(eventsRes.data) ? eventsRes.data.length : 0,
    logsStatus: logsRes.status,
    logsCount: Array.isArray(logsRes.data) ? logsRes.data.length : 0,
    targetedRetryStatus: retryRes.status,
    targetedRetryData: retryRes.data
  }, null, 2));
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
