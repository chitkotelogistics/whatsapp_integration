const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

const LOADS_FILE = path.join(__dirname, 'data/loads.json');

(async () => {
  console.log('Updating fallback loads.json...');
  if (fs.existsSync(LOADS_FILE)) {
    const raw = fs.readFileSync(LOADS_FILE, 'utf8');
    const loads = JSON.parse(raw || '[]');

    const updatedLoads = loads.map(l => {
      const msg = (l.message || '')
        .replace(/9441510824/g, '9390003955')
        .replace(/Suite Tester/g, 'Chitkote Logistics');

      return {
        ...l,
        contactPerson: 'Chitkote Logistics',
        contactNumber: '9390003955',
        message: msg
      };
    });

    fs.writeFileSync(LOADS_FILE, JSON.stringify(updatedLoads, null, 2));
    console.log(`Updated ${updatedLoads.length} loads in loads.json to contact 9390003955.`);
  }

  try {
    await db.query(`
      UPDATE loads 
      SET contact_number = '9390003955', contact_person = 'Chitkote Logistics'
    `);
    console.log('Updated MySQL loads table to contact 9390003955.');
  } catch (e) {
    console.log('MySQL update info:', e.message);
  }
})().catch(err => {
  console.error('Error:', err.message);
});
