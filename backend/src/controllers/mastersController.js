const db = require('../config/db');
const {
  readFallbackParties,
  writeFallbackParties,
  readFallbackTransporters,
  writeFallbackTransporters,
  readFallbackVehicles,
  writeFallbackVehicles,
  readFallbackDrivers,
  writeFallbackDrivers,
} = require('../utils/fileStore');

const normalizePhone = (value = '') => {
  let cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('9191')) cleaned = cleaned.slice(2);
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `91${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return `91${cleaned.slice(1)}`;
  return cleaned;
};

// ==========================================
// 1. PARTIES / CUSTOMERS MASTER
// ==========================================

const getParties = async (req, res) => {
  const fallback = readFallbackParties();
  try {
    const [rows] = await db.query('SELECT * FROM parties ORDER BY created_at DESC');
    const seenIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const item of fallback) {
      if (!seenIds.has(String(item.id))) {
        merged.push(item);
      }
    }
    res.json(merged);
  } catch (err) {
    res.json(fallback);
  }
};

const createParty = async (req, res) => {
  const {
    company_name,
    contact_person,
    mobile,
    email,
    gstin,
    pan,
    billing_address,
    payment_terms,
    document_requirements,
  } = req.body;

  const normalizedMobile = normalizePhone(mobile);
  if (!company_name || !normalizedMobile) {
    return res.status(400).json({ success: false, error: 'Company Name and Mobile number are required' });
  }

  const partyObj = {
    id: Date.now(),
    company_name,
    contact_person: contact_person || '',
    mobile: normalizedMobile,
    email: email || '',
    gstin: gstin || '',
    pan: pan || '',
    billing_address: billing_address || '',
    payment_terms: payment_terms || '15 Days',
    document_requirements: document_requirements || {},
    created_at: new Date().toISOString(),
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO parties (company_name, contact_person, mobile, email, gstin, pan, billing_address, payment_terms, document_requirements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        partyObj.company_name,
        partyObj.contact_person,
        partyObj.mobile,
        partyObj.email,
        partyObj.gstin,
        partyObj.pan,
        partyObj.billing_address,
        partyObj.payment_terms,
        JSON.stringify(partyObj.document_requirements),
      ]
    );
    if (result && result.insertId) {
      partyObj.id = result.insertId;
    }
  } catch (err) {
    // DB handled via fallback
  }

  const fallback = readFallbackParties();
  const existingIdx = fallback.findIndex((p) => normalizePhone(p.mobile) === partyObj.mobile);
  if (existingIdx !== -1) {
    fallback[existingIdx] = partyObj;
  } else {
    fallback.unshift(partyObj);
  }
  writeFallbackParties(fallback);

  res.status(201).json({ success: true, party: partyObj });
};

const updateParty = async (req, res) => {
  const { id } = req.params;
  const {
    company_name,
    contact_person,
    mobile,
    email,
    gstin,
    pan,
    billing_address,
    payment_terms,
    document_requirements,
  } = req.body;

  const normalizedMobile = normalizePhone(mobile);

  try {
    await db.execute(
      `UPDATE parties SET company_name = ?, contact_person = ?, mobile = ?, email = ?, gstin = ?, pan = ?, billing_address = ?, payment_terms = ?, document_requirements = ? WHERE id = ?`,
      [
        company_name,
        contact_person,
        normalizedMobile,
        email,
        gstin,
        pan,
        billing_address,
        payment_terms,
        JSON.stringify(document_requirements || {}),
        id,
      ]
    );
  } catch (err) {
    // DB handle optional
  }

  const fallback = readFallbackParties();
  const idx = fallback.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    fallback[idx] = {
      ...fallback[idx],
      company_name: company_name || fallback[idx].company_name,
      contact_person,
      mobile: normalizedMobile || fallback[idx].mobile,
      email,
      gstin,
      pan,
      billing_address,
      payment_terms,
      document_requirements: document_requirements || fallback[idx].document_requirements,
      updated_at: new Date().toISOString(),
    };
    writeFallbackParties(fallback);
  }

  res.json({ success: true, id });
};

const deleteParty = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM parties WHERE id = ?', [id]);
  } catch (err) {}

  const fallback = readFallbackParties();
  writeFallbackParties(fallback.filter((p) => String(p.id) !== String(id)));
  res.json({ success: true, id });
};

// ==========================================
// 2. TRANSPORTERS / TRUCK OWNERS MASTER
// ==========================================

const getTransporters = async (req, res) => {
  const fallback = readFallbackTransporters();
  try {
    const [rows] = await db.query('SELECT * FROM transporters ORDER BY created_at DESC');
    const seenIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const item of fallback) {
      if (!seenIds.has(String(item.id))) {
        merged.push(item);
      }
    }
    res.json(merged);
  } catch (err) {
    res.json(fallback);
  }
};

const createTransporter = async (req, res) => {
  const {
    company_name,
    contact_name,
    mobile,
    alt_mobile,
    gstin,
    pan,
    address,
    bank_name,
    bank_account,
    ifsc_code,
    upi_id,
  } = req.body;

  const normalizedMobile = normalizePhone(mobile);
  if (!company_name || !normalizedMobile) {
    return res.status(400).json({ success: false, error: 'Company Name and Mobile number are required' });
  }

  const transporterObj = {
    id: Date.now(),
    company_name,
    contact_name: contact_name || '',
    mobile: normalizedMobile,
    alt_mobile: normalizePhone(alt_mobile) || '',
    gstin: gstin || '',
    pan: pan || '',
    address: address || '',
    bank_name: bank_name || '',
    bank_account: bank_account || '',
    ifsc_code: ifsc_code || '',
    upi_id: upi_id || '',
    created_at: new Date().toISOString(),
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO transporters (company_name, contact_name, mobile, alt_mobile, gstin, pan, address, bank_name, bank_account, ifsc_code, upi_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transporterObj.company_name,
        transporterObj.contact_name,
        transporterObj.mobile,
        transporterObj.alt_mobile,
        transporterObj.gstin,
        transporterObj.pan,
        transporterObj.address,
        transporterObj.bank_name,
        transporterObj.bank_account,
        transporterObj.ifsc_code,
        transporterObj.upi_id,
      ]
    );
    if (result && result.insertId) {
      transporterObj.id = result.insertId;
    }
  } catch (err) {}

  const fallback = readFallbackTransporters();
  const existingIdx = fallback.findIndex((t) => normalizePhone(t.mobile) === transporterObj.mobile);
  if (existingIdx !== -1) {
    fallback[existingIdx] = transporterObj;
  } else {
    fallback.unshift(transporterObj);
  }
  writeFallbackTransporters(fallback);

  res.status(201).json({ success: true, transporter: transporterObj });
};

const updateTransporter = async (req, res) => {
  const { id } = req.params;
  const {
    company_name,
    contact_name,
    mobile,
    alt_mobile,
    gstin,
    pan,
    address,
    bank_name,
    bank_account,
    ifsc_code,
    upi_id,
  } = req.body;

  const normalizedMobile = normalizePhone(mobile);

  try {
    await db.execute(
      `UPDATE transporters SET company_name = ?, contact_name = ?, mobile = ?, alt_mobile = ?, gstin = ?, pan = ?, address = ?, bank_name = ?, bank_account = ?, ifsc_code = ?, upi_id = ? WHERE id = ?`,
      [
        company_name,
        contact_name,
        normalizedMobile,
        normalizePhone(alt_mobile),
        gstin,
        pan,
        address,
        bank_name,
        bank_account,
        ifsc_code,
        upi_id,
        id,
      ]
    );
  } catch (err) {}

  const fallback = readFallbackTransporters();
  const idx = fallback.findIndex((t) => String(t.id) === String(id));
  if (idx !== -1) {
    fallback[idx] = {
      ...fallback[idx],
      company_name: company_name || fallback[idx].company_name,
      contact_name,
      mobile: normalizedMobile || fallback[idx].mobile,
      alt_mobile: normalizePhone(alt_mobile),
      gstin,
      pan,
      address,
      bank_name,
      bank_account,
      ifsc_code,
      upi_id,
      updated_at: new Date().toISOString(),
    };
    writeFallbackTransporters(fallback);
  }

  res.json({ success: true, id });
};

const deleteTransporter = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM transporters WHERE id = ?', [id]);
  } catch (err) {}

  const fallback = readFallbackTransporters();
  writeFallbackTransporters(fallback.filter((t) => String(t.id) !== String(id)));
  res.json({ success: true, id });
};

// ==========================================
// 3. VEHICLE MASTER
// ==========================================

const getVehicles = async (req, res) => {
  const fallback = readFallbackVehicles();
  try {
    const [rows] = await db.query('SELECT * FROM vehicles ORDER BY created_at DESC');
    const seenIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const item of fallback) {
      if (!seenIds.has(String(item.id))) {
        merged.push(item);
      }
    }
    res.json(merged);
  } catch (err) {
    res.json(fallback);
  }
};

const createVehicle = async (req, res) => {
  const {
    transporter_id,
    vehicle_number,
    vehicle_type,
    body_type,
    capacity_mt,
    rc_number,
    insurance_number,
    puc_number,
    permit_number,
    fitness_number,
    rc_expiry,
    insurance_expiry,
    puc_expiry,
    permit_expiry,
    fitness_expiry,
    verification_status,
  } = req.body;

  const normalizedNumber = (vehicle_number || '').trim().toUpperCase();
  if (!normalizedNumber || !vehicle_type) {
    return res.status(400).json({ success: false, error: 'Vehicle Number and Vehicle Type are required' });
  }

  const vehicleObj = {
    id: Date.now(),
    transporter_id: transporter_id ? Number(transporter_id) : null,
    vehicle_number: normalizedNumber,
    vehicle_type: vehicle_type || '32 FT Open',
    body_type: body_type || 'Open',
    capacity_mt: capacity_mt || '15 MT',
    rc_number: rc_number || '',
    insurance_number: insurance_number || '',
    puc_number: puc_number || '',
    permit_number: permit_number || '',
    fitness_number: fitness_number || '',
    rc_expiry: rc_expiry || null,
    insurance_expiry: insurance_expiry || null,
    puc_expiry: puc_expiry || null,
    permit_expiry: permit_expiry || null,
    fitness_expiry: fitness_expiry || null,
    verification_status: verification_status || 'VERIFIED',
    created_at: new Date().toISOString(),
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO vehicles (transporter_id, vehicle_number, vehicle_type, body_type, capacity_mt, rc_number, insurance_number, puc_number, permit_number, fitness_number, rc_expiry, insurance_expiry, puc_expiry, permit_expiry, fitness_expiry, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicleObj.transporter_id,
        vehicleObj.vehicle_number,
        vehicleObj.vehicle_type,
        vehicleObj.body_type,
        vehicleObj.capacity_mt,
        vehicleObj.rc_number,
        vehicleObj.insurance_number,
        vehicleObj.puc_number,
        vehicleObj.permit_number,
        vehicleObj.fitness_number,
        vehicleObj.rc_expiry,
        vehicleObj.insurance_expiry,
        vehicleObj.puc_expiry,
        vehicleObj.permit_expiry,
        vehicleObj.fitness_expiry,
        vehicleObj.verification_status,
      ]
    );
    if (result && result.insertId) {
      vehicleObj.id = result.insertId;
    }
  } catch (err) {}

  const fallback = readFallbackVehicles();
  const existingIdx = fallback.findIndex((v) => v.vehicle_number === vehicleObj.vehicle_number);
  if (existingIdx !== -1) {
    fallback[existingIdx] = vehicleObj;
  } else {
    fallback.unshift(vehicleObj);
  }
  writeFallbackVehicles(fallback);

  res.status(201).json({ success: true, vehicle: vehicleObj });
};

const updateVehicle = async (req, res) => {
  const { id } = req.params;
  const {
    transporter_id,
    vehicle_number,
    vehicle_type,
    body_type,
    capacity_mt,
    rc_number,
    insurance_number,
    puc_number,
    permit_number,
    fitness_number,
    rc_expiry,
    insurance_expiry,
    puc_expiry,
    permit_expiry,
    fitness_expiry,
    verification_status,
  } = req.body;

  const normalizedNumber = (vehicle_number || '').trim().toUpperCase();

  try {
    await db.execute(
      `UPDATE vehicles SET transporter_id = ?, vehicle_number = ?, vehicle_type = ?, body_type = ?, capacity_mt = ?, rc_number = ?, insurance_number = ?, puc_number = ?, permit_number = ?, fitness_number = ?, rc_expiry = ?, insurance_expiry = ?, puc_expiry = ?, permit_expiry = ?, fitness_expiry = ?, verification_status = ? WHERE id = ?`,
      [
        transporter_id ? Number(transporter_id) : null,
        normalizedNumber,
        vehicle_type,
        body_type,
        capacity_mt,
        rc_number,
        insurance_number,
        puc_number,
        permit_number,
        fitness_number,
        rc_expiry || null,
        insurance_expiry || null,
        puc_expiry || null,
        permit_expiry || null,
        fitness_expiry || null,
        verification_status || 'PENDING',
        id,
      ]
    );
  } catch (err) {}

  const fallback = readFallbackVehicles();
  const idx = fallback.findIndex((v) => String(v.id) === String(id));
  if (idx !== -1) {
    fallback[idx] = {
      ...fallback[idx],
      transporter_id: transporter_id ? Number(transporter_id) : fallback[idx].transporter_id,
      vehicle_number: normalizedNumber || fallback[idx].vehicle_number,
      vehicle_type: vehicle_type || fallback[idx].vehicle_type,
      body_type,
      capacity_mt,
      rc_number,
      insurance_number,
      puc_number,
      permit_number,
      fitness_number,
      rc_expiry: rc_expiry || null,
      insurance_expiry: insurance_expiry || null,
      puc_expiry: puc_expiry || null,
      permit_expiry: permit_expiry || null,
      fitness_expiry: fitness_expiry || null,
      verification_status: verification_status || fallback[idx].verification_status,
      updated_at: new Date().toISOString(),
    };
    writeFallbackVehicles(fallback);
  }

  res.json({ success: true, id });
};

const deleteVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM vehicles WHERE id = ?', [id]);
  } catch (err) {}

  const fallback = readFallbackVehicles();
  writeFallbackVehicles(fallback.filter((v) => String(v.id) !== String(id)));
  res.json({ success: true, id });
};

// ==========================================
// 4. DRIVER MASTER
// ==========================================

const getDrivers = async (req, res) => {
  const fallback = readFallbackDrivers();
  try {
    const [rows] = await db.query('SELECT * FROM drivers ORDER BY created_at DESC');
    const seenIds = new Set(rows.map((r) => String(r.id)));
    const merged = [...rows];
    for (const item of fallback) {
      if (!seenIds.has(String(item.id))) {
        merged.push(item);
      }
    }
    res.json(merged);
  } catch (err) {
    res.json(fallback);
  }
};

const createDriver = async (req, res) => {
  const { transporter_id, vehicle_id, driver_name, mobile, license_number, license_expiry } = req.body;
  const normalizedMobile = normalizePhone(mobile);

  if (!driver_name || !normalizedMobile) {
    return res.status(400).json({ success: false, error: 'Driver Name and Mobile number are required' });
  }

  const driverObj = {
    id: Date.now(),
    transporter_id: transporter_id ? Number(transporter_id) : null,
    vehicle_id: vehicle_id ? Number(vehicle_id) : null,
    driver_name,
    mobile: normalizedMobile,
    license_number: license_number || '',
    license_expiry: license_expiry || null,
    created_at: new Date().toISOString(),
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO drivers (transporter_id, vehicle_id, driver_name, mobile, license_number, license_expiry)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        driverObj.transporter_id,
        driverObj.vehicle_id,
        driverObj.driver_name,
        driverObj.mobile,
        driverObj.license_number,
        driverObj.license_expiry,
      ]
    );
    if (result && result.insertId) {
      driverObj.id = result.insertId;
    }
  } catch (err) {}

  const fallback = readFallbackDrivers();
  const existingIdx = fallback.findIndex((d) => normalizePhone(d.mobile) === driverObj.mobile);
  if (existingIdx !== -1) {
    fallback[existingIdx] = driverObj;
  } else {
    fallback.unshift(driverObj);
  }
  writeFallbackDrivers(fallback);

  res.status(201).json({ success: true, driver: driverObj });
};

const updateDriver = async (req, res) => {
  const { id } = req.params;
  const { transporter_id, vehicle_id, driver_name, mobile, license_number, license_expiry } = req.body;
  const normalizedMobile = normalizePhone(mobile);

  try {
    await db.execute(
      `UPDATE drivers SET transporter_id = ?, vehicle_id = ?, driver_name = ?, mobile = ?, license_number = ?, license_expiry = ? WHERE id = ?`,
      [
        transporter_id ? Number(transporter_id) : null,
        vehicle_id ? Number(vehicle_id) : null,
        driver_name,
        normalizedMobile,
        license_number,
        license_expiry || null,
        id,
      ]
    );
  } catch (err) {}

  const fallback = readFallbackDrivers();
  const idx = fallback.findIndex((d) => String(d.id) === String(id));
  if (idx !== -1) {
    fallback[idx] = {
      ...fallback[idx],
      transporter_id: transporter_id ? Number(transporter_id) : fallback[idx].transporter_id,
      vehicle_id: vehicle_id ? Number(vehicle_id) : fallback[idx].vehicle_id,
      driver_name: driver_name || fallback[idx].driver_name,
      mobile: normalizedMobile || fallback[idx].mobile,
      license_number,
      license_expiry: license_expiry || null,
      updated_at: new Date().toISOString(),
    };
    writeFallbackDrivers(fallback);
  }

  res.json({ success: true, id });
};

const deleteDriver = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM drivers WHERE id = ?', [id]);
  } catch (err) {}

  const fallback = readFallbackDrivers();
  writeFallbackDrivers(fallback.filter((d) => String(d.id) !== String(id)));
  res.json({ success: true, id });
};

module.exports = {
  getParties,
  createParty,
  updateParty,
  deleteParty,
  getTransporters,
  createTransporter,
  updateTransporter,
  deleteTransporter,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
};
