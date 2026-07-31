const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const logsRes = await axios.get(`${base}/message-logs`);

  console.log('Most Recent 10 Message Logs in Database:');
  const items = (logsRes.data || []).slice(0, 10).map(m => ({
    id: m.id,
    mobile: m.mobile,
    status: m.status,
    messageId: m.messageId || m.message_id,
    created_at: m.created_at || m.createdAt,
    updated_at: m.updated_at || m.updatedAt
  }));

  console.log(JSON.stringify(items, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
