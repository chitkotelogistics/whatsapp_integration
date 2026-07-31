const fs = require('fs');
const path = require('path');
const pool = require('./db');

const addIndexIfMissing = async (table, indexName, columnsSql) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(1) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, indexName]
    );

    if (rows[0] && rows[0].cnt === 0) {
      await pool.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columnsSql})`);
    }
  } catch (error) {
    // Ignore index creation errors
  }
};

const initializeDatabase = async () => {
  try {
    const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    // Apply performance indexes
    await addIndexIfMissing('contacts', 'idx_contacts_mobile', 'mobile');
    await addIndexIfMissing('contacts', 'idx_contacts_city', 'city');
    await addIndexIfMissing('message_logs', 'idx_message_logs_status', 'status');
    await addIndexIfMissing('message_logs', 'idx_message_logs_msgid', 'message_id');
    await addIndexIfMissing('message_logs', 'idx_message_logs_mobile', 'mobile');
    await addIndexIfMissing('scheduled_messages', 'idx_scheduled_messages_status_date', 'status, scheduled_at');
    await addIndexIfMissing('loads', 'idx_loads_load_id', 'load_id');

    console.log('Database initialized with performance indexes');
  } catch (error) {
    console.error('Database initialization warning:', error.message);
  }
};

module.exports = initializeDatabase;
