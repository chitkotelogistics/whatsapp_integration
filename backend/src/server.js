const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const whatsappRoutes = require('./routes/whatsappRoutes');
const initializeDatabase = require('./config/initDb');
const { startScheduler } = require('./services/messageScheduler');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', whatsappRoutes);

const PORT = process.env.PORT || 5000;
(async () => {
  await initializeDatabase();
  startScheduler(Number(process.env.SCHEDULE_INTERVAL_MS || 60000));
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
