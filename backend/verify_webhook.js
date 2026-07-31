const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  // 1. Get recent message logs
  const logsBefore = await axios.get(`${base}/message-logs`);
  const recentLog = (logsBefore.data || [])[0];
  if (!recentLog || !recentLog.message_id) {
    console.log('No recent message ID found to test status update');
    return;
  }

  console.log('Testing webhook status update for message_id:', recentLog.message_id, 'current status:', recentLog.status);

  // 2. Send webhook status update (delivered)
  const statusPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: recentLog.mobile, phone_number_id: '10001' },
              statuses: [
                {
                  id: recentLog.message_id,
                  status: 'delivered',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recentLog.mobile
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const webhookRes = await axios.post(`${base}/webhook`, statusPayload);

  // 3. Verify message_logs status updated
  const logsAfter = await axios.get(`${base}/message-logs`);
  const matchingLog = (logsAfter.data || []).find((l) => l.message_id === recentLog.message_id || l.id === recentLog.id);

  console.log(JSON.stringify({
    webhookResponse: webhookRes.data,
    logId: recentLog.id,
    messageId: recentLog.message_id,
    previousStatus: recentLog.status,
    newStatus: matchingLog ? matchingLog.status : 'NOT_FOUND'
  }, null, 2));
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
