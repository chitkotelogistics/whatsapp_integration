const {
  getParties,
  createParty,
  getTransporters,
  createTransporter,
  getVehicles,
  createVehicle,
  getDrivers,
  createDriver,
} = require('../src/controllers/mastersController');
const { createLoad, getLoads } = require('../src/controllers/whatsappController');

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const runTest = async () => {
  console.log('--- STARTING PHASE 1 VERIFICATION TESTS ---');

  // 1. Create Party
  const partyReq = {
    body: {
      company_name: 'ABC Industries Ltd',
      contact_person: 'Rajesh Sharma',
      mobile: '9876543210',
      email: 'rajesh@abc.com',
      gstin: '36ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      billing_address: 'Plot 45, Gachibowli, Hyderabad',
      payment_terms: '15 Days',
    },
  };
  const partyRes = mockRes();
  await createParty(partyReq, partyRes);
  console.log('✓ Create Party Result:', partyRes.body);

  // 2. Create Transporter
  const transporterReq = {
    body: {
      company_name: 'Sri Balaji Logistics',
      contact_name: 'Manjunath',
      mobile: '9390003955',
      alt_mobile: '9441510824',
      gstin: '36XYZST9876M1Z2',
      pan: 'XYZST9876M',
      bank_name: 'HDFC Bank',
      bank_account: '5010023456789',
      ifsc_code: 'HDFC0001234',
    },
  };
  const transporterRes = mockRes();
  await createTransporter(transporterReq, transporterRes);
  console.log('✓ Create Transporter Result:', transporterRes.body);

  const partyId = partyRes.body?.party?.id;
  const transporterId = transporterRes.body?.transporter?.id;

  // 3. Create Vehicle
  const vehicleReq = {
    body: {
      transporter_id: transporterId,
      vehicle_number: 'TS09AB1234',
      vehicle_type: '32 FT Open',
      capacity_mt: '15 MT',
      rc_number: 'TS09AB1234-RC',
      insurance_number: 'INS-99887766',
    },
  };
  const vehicleRes = mockRes();
  await createVehicle(vehicleReq, vehicleRes);
  console.log('✓ Create Vehicle Result:', vehicleRes.body);

  const vehicleId = vehicleRes.body?.vehicle?.id;

  // 4. Create Driver
  const driverReq = {
    body: {
      transporter_id: transporterId,
      vehicle_id: vehicleId,
      driver_name: 'Ravi Kumar',
      mobile: '919876543211',
      license_number: 'DL-3620200012345',
    },
  };
  const driverRes = mockRes();
  await createDriver(driverReq, driverRes);
  console.log('✓ Create Driver Result:', driverRes.body);

  const driverId = driverRes.body?.driver?.id;

  // 5. Create Load with Party Rate ₹45,000 and Transporter Rate ₹38,000
  const loadReq = {
    body: {
      loadId: 'CK-1025',
      from: 'Hyderabad',
      to: 'Chennai',
      material: 'General Cargo',
      weight: '15 MT',
      vehicleType: '32 FT Open',
      loadingDate: '18 Sep',
      contactPerson: 'ABC Industries',
      contactNumber: '9876543210',
      party_id: partyId,
      party_rate: 45000,
      transporter_id: transporterId,
      transporter_rate: 38000,
      vehicle_id: vehicleId,
      driver_id: driverId,
    },
  };
  const loadRes = mockRes();
  await createLoad(loadReq, loadRes);
  console.log('✓ Create Load CK-1025 Result:', loadRes.body);

  console.log('--- PHASE 1 VERIFICATION COMPLETED SUCCESSFULLY ---');
};

runTest().catch((err) => console.error('Verification Error:', err));
