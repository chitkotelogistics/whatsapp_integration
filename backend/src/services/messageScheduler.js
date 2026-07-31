const db = require('../config/db');
const { queueSend } = require('./whatsappService');
const { getSettingsConfig } = require('./settingsService');

const schedulePendingMessages = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM scheduled_messages WHERE status = ? AND scheduled_at <= NOW()', ['pending']);
    if (!rows.length) return;

    const config = await getSettingsConfig();
    const sendItems = rows.map((row) => ({ to: row.mobile, message: row.message, type: row.type }));
    const results = await queueSend(config, sendItems);

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const result = results[i] || {};
      await db.execute(
        'UPDATE message_logs SET status = ?, response_data = ?, updated_at = NOW() WHERE scheduled_message_id = ? AND status = ?',
        ['sent', JSON.stringify(result), row.id, 'pending']
      );
    }

    const ids = rows.map((row) => row.id);
    await db.query('UPDATE scheduled_messages SET status = ?, updated_at = NOW() WHERE id IN (?)', ['sent', ids]);
  } catch (error) {
    console.error('Scheduled send failed:', error.message);
  }
};

const startScheduler = (intervalMs = 60000) => {
  schedulePendingMessages();
  setInterval(schedulePendingMessages, intervalMs);
};

module.exports = { startScheduler, schedulePendingMessages };