const fs = require('fs');
const path = require('path');
let mysql = null;
try {
  mysql = require(path.join(__dirname, '../backend/node_modules/mysql2/promise'));
} catch (e) {
  try { mysql = require('mysql2/promise'); } catch(e2) {}
}
try {
  require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
} catch(e) {}

const RAW_CSV_PATH = path.join(__dirname, '../google_contacts_raw.csv');
const OUTPUT_CSV_PATH = path.join(__dirname, '../google_contacts_formatted_for_broadcast.csv');
const FRONTEND_PUBLIC_CSV = path.join(__dirname, '../frontend/public/google_contacts_broadcast.csv');
const CONTACTS_JSON_PATH = path.join(__dirname, '../backend/data/contacts.json');

function normalizePhone(value) {
  if (!value) return '';
  let cleaned = String(value).replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('9191') && cleaned.length > 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return '91' + cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return '91' + cleaned.slice(1);
  }
  if (cleaned.length >= 10) {
    const last10 = cleaned.slice(-10);
    if (/^[6-9]/.test(last10)) {
      return '91' + last10;
    }
  }
  return '';
}

function detectVehicleType(text) {
  if (!text) return 'Truck / Transport';
  const lower = text.toLowerCase();
  if (lower.includes('32') && (lower.includes('sxl') || lower.includes('mtxl') || lower.includes('xl') || lower.includes('multi'))) return '32 FT Multi Axle';
  if (lower.includes('32') && (lower.includes('cont') || lower.includes('cnt'))) return '32 FT Container';
  if (lower.includes('32')) return '32 FT Open Truck';
  if (lower.includes('24') && (lower.includes('cont') || lower.includes('cnt'))) return '24 FT Container';
  if (lower.includes('24')) return '24 FT Open Truck';
  if (lower.includes('22') && (lower.includes('cont') || lower.includes('cnt'))) return '22 FT Container';
  if (lower.includes('22')) return '22 FT Open Truck';
  if (lower.includes('20') && (lower.includes('cont') || lower.includes('cnt'))) return '20 FT Container';
  if (lower.includes('20')) return '20 FT Open Truck';
  if (lower.includes('19') && (lower.includes('cont') || lower.includes('cnt'))) return '19 FT Container';
  if (lower.includes('19')) return '19 FT Open Truck';
  if (lower.includes('16') || lower.includes('14') || lower.includes('12') || lower.includes('10')) {
    if (lower.includes('wheel') || lower.includes('weel') || lower.includes('veel')) {
      const match = lower.match(/(\d+)\s*(?:wheel|weel|veel)/);
      return match ? `${match[1]} Wheeler Truck` : '10-14 Wheeler Truck';
    }
    if (lower.includes('feet') || lower.includes('ft')) {
      const match = lower.match(/(\d+)\s*(?:feet|ft)/);
      return match ? `${match[1]} FT Truck` : '14 FT Truck';
    }
    if (lower.includes('t') || lower.includes('ton')) return '12-16 Ton Truck';
  }
  if (lower.includes('trailer') || lower.includes('trailor')) return 'Trailer';
  if (lower.includes('container') || lower.includes('cont')) return '20/32 FT Container';
  if (lower.includes('dcm') || lower.includes('eicher') || lower.includes('eacher')) return 'Eicher / DCM';
  if (lower.includes('dost') || lower.includes('bolero') || lower.includes('pickup')) return 'Pickup / Dost';
  return 'Truck / Transport';
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function run() {
  if (!fs.existsSync(RAW_CSV_PATH)) {
    console.error('File not found:', RAW_CSV_PATH);
    return;
  }

  const rawContent = fs.readFileSync(RAW_CSV_PATH, 'utf8');
  const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return;

  const headerCols = parseCSVLine(lines[0]);
  const colIndex = {};
  headerCols.forEach((col, idx) => {
    colIndex[col.trim()] = idx;
  });

  const parsedContacts = [];
  const seenMobiles = new Set();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row || !row.length) continue;

    const get = (colName) => (colIndex[colName] !== undefined ? (row[colIndex[colName]] || '').trim() : '');

    const firstName = get('First Name');
    const middleName = get('Middle Name');
    const lastName = get('Last Name');
    const orgName = get('Organization Name');
    const city = get('Address 1 - City');
    const state = get('Address 1 - Region');
    const notes = get('Notes');

    const nameParts = [firstName, middleName, lastName].filter(Boolean);
    let displayName = nameParts.join(' ').replace(/,{2,}/g, ' ').trim();
    if (!displayName) displayName = orgName || '';

    // Collect all phone candidates from Phone 1, Phone 2, Phone 3
    const rawPhones = [get('Phone 1 - Value'), get('Phone 2 - Value'), get('Phone 3 - Value')].filter(Boolean);
    const phoneCandidates = [];
    rawPhones.forEach(pStr => {
      // split by ::: or commas or slashes
      pStr.split(/:::|,|\//).forEach(sub => {
        const norm = normalizePhone(sub);
        if (norm && norm.length === 12) {
          phoneCandidates.push(norm);
        }
      });
    });

    if (!phoneCandidates.length) continue;

    const vehicleType = detectVehicleType(displayName + ' ' + notes);
    const company = orgName || (displayName.includes('Tpt') || displayName.includes('Transport') || displayName.includes('Roadlines') ? displayName : '');

    phoneCandidates.forEach(mobile => {
      if (seenMobiles.has(mobile)) return;
      seenMobiles.add(mobile);

      parsedContacts.push({
        name: displayName || `Contact ${mobile.slice(-4)}`,
        mobile,
        company,
        city,
        state,
        vehicle_type: vehicleType,
      });
    });
  }

  console.log(`Extracted ${parsedContacts.length} unique valid broadcast contacts!`);

  // Write output CSV
  const csvHeaders = 'name,mobile,company,city,state,vehicle_type\n';
  const csvRows = parsedContacts.map(c => 
    `"${(c.name || '').replace(/"/g, '""')}","${c.mobile}","${(c.company || '').replace(/"/g, '""')}","${(c.city || '').replace(/"/g, '""')}","${(c.state || '').replace(/"/g, '""')}","${c.vehicle_type}"`
  ).join('\n');

  fs.writeFileSync(OUTPUT_CSV_PATH, csvHeaders + csvRows, 'utf8');
  console.log('Saved formatted CSV to:', OUTPUT_CSV_PATH);

  // Also write to frontend/public for easy download
  const publicDir = path.dirname(FRONTEND_PUBLIC_CSV);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(FRONTEND_PUBLIC_CSV, csvHeaders + csvRows, 'utf8');
  console.log('Saved to frontend public:', FRONTEND_PUBLIC_CSV);

  // Update backend/data/contacts.json
  let existingJson = [];
  if (fs.existsSync(CONTACTS_JSON_PATH)) {
    try {
      existingJson = JSON.parse(fs.readFileSync(CONTACTS_JSON_PATH, 'utf8'));
    } catch(e) {}
  }
  const existingSet = new Set(existingJson.map(c => normalizePhone(c.mobile)).filter(Boolean));
  let newAddedCount = 0;

  const contactsToAdd = [];
  parsedContacts.forEach((c, idx) => {
    if (!existingSet.has(c.mobile)) {
      existingSet.add(c.mobile);
      contactsToAdd.push({
        id: Date.now() + idx,
        name: c.name,
        mobile: c.mobile,
        company: c.company,
        city: c.city,
        state: c.state,
        vehicle_type: c.vehicle_type,
        is_active: 1,
        created_at: new Date().toISOString()
      });
      newAddedCount++;
    }
  });

  const updatedJson = [...contactsToAdd, ...existingJson];
  fs.writeFileSync(CONTACTS_JSON_PATH, JSON.stringify(updatedJson, null, 2), 'utf8');
  console.log(`Updated contacts.json: added ${newAddedCount} new contacts, total now ${updatedJson.length}`);

  // Also insert into MySQL if available
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'chitkote_logistics',
    });
    
    for (const c of contactsToAdd) {
      await pool.execute(
        'INSERT IGNORE INTO contacts (name, mobile, company, city, state, vehicle_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.name, c.mobile, c.company, c.city, c.state, c.vehicle_type, 1]
      ).catch(() => {});
    }
    console.log('Synchronized to MySQL database!');
    await pool.end();
  } catch(err) {
    console.log('MySQL sync skipped (using fileStore fallback):', err.message);
  }
}

run().catch(console.error);
