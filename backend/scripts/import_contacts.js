const fs = require('fs');
const path = require('path');
const readline = require('readline');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node import_contacts.js <contacts.csv>');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const contactsJson = path.join(root, 'data', 'contacts.json');
const logFile = path.join(root, 'import_debug_node.log');

function dlog(msg) {
  try { fs.appendFileSync(logFile, msg + '\n', 'utf8'); } catch (e) {}
}

function normalizePhone(s) {
  if (!s) return '';
  let digits = s.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return digits;
}

async function run() {
  dlog(`START node import: csv=${csvPath} contacts_json=${contactsJson}`);
  let existing = [];
  try {
    if (fs.existsSync(contactsJson)) {
      existing = JSON.parse(fs.readFileSync(contactsJson, 'utf8')) || [];
    }
  } catch (e) {
    dlog('Error reading existing contacts: ' + e.message);
    existing = [];
  }

  const existingMobiles = new Set(existing.map(c => normalizePhone(c.mobile || c.phone || '')));
  const added = [];
  let rows = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(csvPath, { encoding: 'utf8' }) });
  for await (const line of rl) {
    rows++;
    // try to find phone-like substrings
    const phones = [];
    const found = line.match(/\d[\d\s\-:\+]{6,}\d/g);
    if (found) {
      for (const f of found) {
        const p = normalizePhone(f);
        if (p) phones.push(p);
      }
    }
    if (phones.length === 0) continue;
    const primary = phones[0];
    if (!primary) continue;
    if (existingMobiles.has(primary)) continue;
    // name: take leading text before first comma
    const name = line.split(',')[0].replace(/\"/g, '').trim() || primary;
    const contact = {
      id: Date.now() + rows,
      name,
      mobile: primary,
      company: '',
      city: '',
      state: '',
      vehicle_type: '',
      is_active: 1,
      created_at: new Date().toISOString()
    };
    added.push(contact);
    existingMobiles.add(primary);
  }

  dlog(`Rows scanned: ${rows}, Added: ${added.length}`);
  if (added.length === 0) {
    console.log('No new contacts found to import.');
    return;
  }

  const newList = added.concat(existing);
  try {
    fs.mkdirSync(path.dirname(contactsJson), { recursive: true });
    fs.writeFileSync(contactsJson, JSON.stringify(newList, null, 2), 'utf8');
    dlog(`Imported ${added.length} contacts`);
    console.log(`Imported ${added.length} contacts`);
  } catch (e) {
    dlog('Error writing contacts.json: ' + e.message);
    console.error('Failed to write contacts.json:', e.message);
    process.exit(1);
  }
}

run().catch(err => {
  dlog('Unhandled error: ' + err.message);
  console.error(err);
  process.exit(1);
});
