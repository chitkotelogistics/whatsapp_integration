const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const whatsappRoutes = require('./routes/whatsappRoutes');
const initializeDatabase = require('./config/initDb');
const { startScheduler } = require('./services/messageScheduler');

const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', whatsappRoutes);

const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
  });
} else {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0; url=/" />
          </head>
          <body>
            <p>Redirecting to dashboard...</p>
            <script>window.location.href = '/';</script>
          </body>
        </html>
      `);
    }
  });
}

const PORT = process.env.PORT || 5000;
(async () => {
  await initializeDatabase();
  startScheduler(Number(process.env.SCHEDULE_INTERVAL_MS || 60000));
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
