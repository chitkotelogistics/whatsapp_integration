const db = require('../config/db');
const { readFallbackContacts, writeFallbackContacts } = require('../utils/fileStore');

const normalizePhone = (value = '') => {
  let cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('9191')) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }

  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return `91${cleaned.slice(1)}`;
  }

  return cleaned;
};

const normalizeContactPayload = (payload = {}) => ({
  name: payload.name || '',
  mobile: normalizePhone(payload.mobile || payload.phone || ''),
  company: payload.company || '',
  city: payload.city || '',
  state: payload.state || '',
  vehicleType: payload.vehicleType || payload.vehicle_type || '',
});

const listContacts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
    const fallbackContacts = readFallbackContacts();
    const seenMobiles = new Set(rows.map((row) => normalizePhone(row.mobile)).filter(Boolean));
    const merged = [...rows];
    for (const contact of fallbackContacts) {
      const normMob = normalizePhone(contact.mobile);
      if (normMob && !seenMobiles.has(normMob)) {
        seenMobiles.add(normMob);
        merged.push(contact);
      }
    }
    res.json(merged);
  } catch (error) {
    const fallbackContacts = readFallbackContacts();
    res.json(fallbackContacts);
  }
};

const createContact = async (req, res) => {
  const payload = normalizeContactPayload(req.body);
  const { name, mobile, company, city, state, vehicleType } = payload;

  if (!mobile) {
    return res.status(400).json({ success: false, error: 'Mobile number is required' });
  }

  let dbInsertId = null;
  try {
    const [result] = await db.execute(
      'INSERT INTO contacts (name, mobile, company, city, state, vehicle_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name || mobile, mobile, company, city, state, vehicleType, 1]
    );
    dbInsertId = result.insertId;
  } catch (error) {
    // DB error handled via fileStore fallback
  }

  const fallbackContacts = readFallbackContacts();
  const existingIdx = fallbackContacts.findIndex((c) => normalizePhone(c.mobile) === mobile);
  const contactObj = {
    id: dbInsertId || Date.now(),
    name: name || mobile,
    mobile,
    company: company || '',
    city: city || '',
    state: state || '',
    vehicle_type: vehicleType || '',
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    fallbackContacts[existingIdx] = contactObj;
    writeFallbackContacts(fallbackContacts);
  } else {
    writeFallbackContacts([contactObj, ...fallbackContacts]);
  }

  res.status(201).json({ success: true, id: contactObj.id, contact: contactObj });
};

const updateContact = async (req, res) => {
  const { id } = req.params;
  const payload = normalizeContactPayload(req.body);
  const { name, mobile, company, city, state, vehicleType } = payload;

  try {
    await db.execute(
      'UPDATE contacts SET name = ?, mobile = ?, company = ?, city = ?, state = ?, vehicle_type = ? WHERE id = ? OR mobile = ?',
      [name, mobile, company, city, state, vehicleType, id, mobile]
    );
  } catch (error) {
    // ignore DB write error
  }

  const fallbackContacts = readFallbackContacts();
  const nextContacts = fallbackContacts.map((contact) =>
    String(contact.id) === String(id) || (mobile && normalizePhone(contact.mobile) === mobile)
      ? { ...contact, name: name || contact.name, mobile: mobile || contact.mobile, company, city, state, vehicle_type: vehicleType }
      : contact
  );
  writeFallbackContacts(nextContacts);
  res.json({ success: true, id: Number(id) || id, fallback: true });
};

const importContacts = async (req, res) => {
  const payloadContacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];

  if (!payloadContacts.length) {
    return res.status(400).json({ success: false, error: 'No contacts provided for import' });
  }

  const existingContacts = [];
  try {
    const [rows] = await db.query('SELECT mobile FROM contacts');
    existingContacts.push(...rows.map((row) => normalizePhone(row.mobile)));
  } catch (dbError) {
    existingContacts.push(...readFallbackContacts().map((row) => normalizePhone(row.mobile)));
  }

  const seenMobiles = new Set(existingContacts.filter(Boolean));
  const contactsToInsert = [];
  const duplicatesSkipped = [];

  payloadContacts.forEach((contact, index) => {
    const normalized = normalizeContactPayload(contact);
    if (!normalized.name && !normalized.mobile) return;
    if (!normalized.mobile) return;

    if (seenMobiles.has(normalized.mobile)) {
      duplicatesSkipped.push(normalized.mobile);
      return;
    }

    seenMobiles.add(normalized.mobile);
    contactsToInsert.push({
      id: Date.now() + index,
      name: normalized.name || normalized.mobile,
      mobile: normalized.mobile,
      company: normalized.company || '',
      city: normalized.city || '',
      state: normalized.state || '',
      vehicle_type: normalized.vehicleType || '',
      is_active: 1,
      created_at: new Date().toISOString(),
    });
  });

  try {
    for (const contact of contactsToInsert) {
      await db.execute(
        'INSERT INTO contacts (name, mobile, company, city, state, vehicle_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [contact.name, contact.mobile, contact.company, contact.city, contact.state, contact.vehicle_type, contact.is_active]
      );
    }
  } catch (error) {
    // DB write error handled via fallback store below
  }

  const fallbackContacts = readFallbackContacts();
  writeFallbackContacts([...contactsToInsert, ...fallbackContacts]);
  res.status(201).json({ success: true, imported: contactsToInsert.length, duplicatesSkipped: duplicatesSkipped.length });
};

const deleteContact = async (req, res) => {
  const { id } = req.params;
  const idStr = String(id).trim();

  let mobile = null;
  try {
    const [rows] = await db.query('SELECT mobile FROM contacts WHERE id = ?', [id]);
    if (rows.length > 0) mobile = rows[0].mobile;
  } catch (e) {}

  const fallbackContacts = readFallbackContacts();
  const targetFallback = fallbackContacts.find((c) => String(c.id) === idStr);
  if (!mobile && targetFallback) mobile = targetFallback.mobile;

  const normMob = mobile ? normalizePhone(mobile) : null;

  try {
    if (normMob) {
      await db.execute('DELETE FROM contacts WHERE id = ? OR mobile = ? OR mobile = ?', [id, mobile, normMob]);
    } else {
      await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
    }
  } catch (error) {
    // DB delete warning handled via fileStore sync
  }

  const nextContacts = fallbackContacts.filter(
    (c) => String(c.id) !== idStr && (!normMob || normalizePhone(c.mobile) !== normMob)
  );
  writeFallbackContacts(nextContacts);

  res.json({ success: true, id });
};

const deleteContactsBulk = async (req, res) => {
  const { ids = [] } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ success: false, error: 'No contact IDs provided for bulk delete' });
  }

  const strIds = new Set(ids.map((id) => String(id).trim()));

  const targetMobiles = new Set();
  const fallbackContacts = readFallbackContacts();
  for (const c of fallbackContacts) {
    if (strIds.has(String(c.id))) {
      const norm = normalizePhone(c.mobile);
      if (norm) targetMobiles.add(norm);
    }
  }

  try {
    const [rows] = await db.query('SELECT id, mobile FROM contacts');
    for (const r of rows) {
      if (strIds.has(String(r.id))) {
        const norm = normalizePhone(r.mobile);
        if (norm) targetMobiles.add(norm);
      }
    }
  } catch (e) {}

  try {
    for (const singleId of ids) {
      await db.execute('DELETE FROM contacts WHERE id = ?', [singleId]);
    }
    if (targetMobiles.size > 0) {
      await db.query('DELETE FROM contacts WHERE mobile IN (?)', [Array.from(targetMobiles)]);
    }
  } catch (error) {
    // DB delete warning handled via fileStore sync
  }

  const nextContacts = fallbackContacts.filter((c) => {
    const isIdMatch = strIds.has(String(c.id));
    const isMobMatch = c.mobile && targetMobiles.has(normalizePhone(c.mobile));
    return !isIdMatch && !isMobMatch;
  });
  writeFallbackContacts(nextContacts);

  res.json({ success: true, deleted: ids.length });
};

module.exports = { listContacts, createContact, updateContact, importContacts, deleteContact, deleteContactsBulk };
