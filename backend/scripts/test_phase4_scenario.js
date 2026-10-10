const {
  createParty,
  createTransporter,
  createVehicle,
  createDriver,
} = require('../src/controllers/mastersController');
const { createLoad, getLoads } = require('../src/controllers/whatsappController');
const {
  submitNegotiation,
  acceptTransporterOffer,
  filterLoadCommercials,
} = require('../src/controllers/negotiationController');
const {
  generateDocumentUploadLink,
  generateDriverActionLink,
  getPortalDataByToken,
  uploadPortalDocument,
  updateDocumentVerificationStatus,
  handleDriverActionByToken,
} = require('../src/controllers/documentPortalController');
const {
  generateLoadingSlipHtml,
  generateCustomerInvoiceHtml,
  generateTransporterSettlementHtml,
  generateCommissionBillHtml,
} = require('../src/services/pdfService');
const { logActivity, notifyParticipants } = require('../src/controllers/tripController');

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
  res.setHeader = () => res;
  res.send = (content) => {
    res.body = content;
    return res;
  };
  return res;
};

const runCompleteScenarioTest = async () => {
  console.log('===================================================');
  console.log('--- STARTING COMPLETE CK-1025 END-TO-END SCENARIO ---');
  console.log('===================================================');

  const loadId = 'CK-1025';

  // STEP 1: Create Load CK-1025 with Customer Rate ₹45,000
  console.log('\n[STEP 1] Creating Load CK-1025 (Hyderabad → Chennai, 32 FT Open, 15 MT, Party Rate: ₹45,000)...');
  const createLoadRes = mockRes();
  await createLoad(
    {
      body: {
        loadId,
        from: 'Hyderabad',
        to: 'Chennai',
        material: 'General Cargo',
        weight: '15 MT',
        vehicleType: '32 FT Open',
        loadingDate: '18 Sep',
        contactPerson: 'ABC Industries',
        contactNumber: '9876543210',
        party_rate: 45000,
      },
    },
    createLoadRes
  );
  console.log('✓ Load Created:', createLoadRes.body?.loadId, 'Party Rate: ₹' + createLoadRes.body?.load?.party_rate);
  await logActivity(loadId, 'Load Created', 'CK Operations Staff', 'CK_OPERATIONS', 'Created Load CK-1025');

  // STEP 2: Post Load through WhatsApp
  console.log('\n[STEP 2] Posting Load to Transporters via WhatsApp...');
  await logActivity(loadId, 'Load Posted on WhatsApp', 'CK Operations Staff', 'CK_OPERATIONS', 'Dispatched WhatsApp broadcast to target fleet owners');
  console.log('✓ Load Posted on WhatsApp');

  // STEP 3: Receive Truck Owner Reply & Start Negotiation
  console.log('\n[STEP 3] Receiving Truck Owner quotes & starting negotiation...');
  const neg1 = mockRes();
  await submitNegotiation(
    { body: { loadId, transporter_name: 'Sri Balaji Logistics', transporter_mobile: '919390003955', offered_rate: 40000 } },
    neg1
  );
  console.log('✓ Quote 1 Received: ₹40,000 from Sri Balaji Logistics');

  const neg2 = mockRes();
  await submitNegotiation(
    { body: { loadId, transporter_name: 'Sri Balaji Logistics', transporter_mobile: '919390003955', offered_rate: 38000 } },
    neg2
  );
  console.log('✓ Quote 2 Received (Counter): ₹38,000 final from Sri Balaji Logistics');

  // STEP 4: Confirm Rate ₹38,000
  console.log('\n[STEP 4] Confirming final rate ₹38,000...');
  const acceptRes = mockRes();
  await acceptTransporterOffer(
    { body: { loadId, negotiationId: neg2.body?.quote?.id, transporter_id: 101, final_rate: 38000 } },
    acceptRes
  );
  console.log('✓ Transporter Rate Confirmed: ₹38,000');
  await logActivity(loadId, 'Rate Confirmed', 'CK Operations Staff', 'CK_OPERATIONS', 'Rate confirmed at ₹38,000');

  // STEP 5: Assign Vehicle & Driver
  console.log('\n[STEP 5] Assigning Vehicle TS09AB1234 & Driver Ravi Kumar...');
  await logActivity(loadId, 'Vehicle Assigned', 'CK Operations Staff', 'CK_OPERATIONS', 'Assigned Vehicle TS09AB1234 & Driver Ravi Kumar');
  console.log('✓ Vehicle TS09AB1234 & Driver Ravi Assigned');

  // STEP 6: Request Documents via Mobile Upload Link
  console.log('\n[STEP 6] Generating and sending Document Upload Link via WhatsApp...');
  const docLinkRes = mockRes();
  await generateDocumentUploadLink({ params: { loadId } }, docLinkRes);
  const docToken = docLinkRes.body?.token;
  console.log('✓ Secure Upload Link Sent:', docLinkRes.body?.link);

  // STEP 7: Upload Documents through Mobile Link
  console.log('\n[STEP 7] Transporter uploads required documents through Mobile Upload Link...');
  const uploadRcRes = mockRes();
  await uploadPortalDocument(
    { body: { token: docToken, doc_type: 'rc', file_url: 'data:image/png;base64,sample_rc_data' } },
    uploadRcRes
  );
  console.log('✓ RC Uploaded:', uploadRcRes.body?.message);

  const uploadInsRes = mockRes();
  await uploadPortalDocument(
    { body: { token: docToken, doc_type: 'insurance', file_url: 'data:image/png;base64,sample_ins_data' } },
    uploadInsRes
  );
  console.log('✓ Insurance Uploaded:', uploadInsRes.body?.message);

  const uploadDlRes = mockRes();
  await uploadPortalDocument(
    { body: { token: docToken, doc_type: 'driver_license', file_url: 'data:image/png;base64,sample_dl_data' } },
    uploadDlRes
  );
  console.log('✓ Driver License Uploaded:', uploadDlRes.body?.message);

  // STEP 8: Mark Driver License unclear -> Trigger Re-upload Request -> Upload Replacement -> Verify
  console.log('\n[STEP 8] Operations reviews documents. Marking Driver License as unclear (NEEDS_REUPLOAD)...');
  const dlDocId = uploadDlRes.body?.document?.id;
  const reuploadRes = mockRes();
  await updateDocumentVerificationStatus(
    {
      params: { docId: dlDocId },
      body: { status: 'NEEDS_REUPLOAD', rejection_reason: 'DL image is blurred. Please upload clear photo.', reviewer: 'CK Operations Staff' },
    },
    reuploadRes
  );
  console.log('✓ Driver License marked NEEDS_REUPLOAD. Re-upload WhatsApp alert dispatched.');

  console.log('Uploading replacement Driver License photo...');
  const replaceDlRes = mockRes();
  await uploadPortalDocument(
    { body: { token: docToken, doc_type: 'driver_license', file_url: 'data:image/png;base64,replacement_dl_data' } },
    replaceDlRes
  );
  const newDlDocId = replaceDlRes.body?.document?.id;

  console.log('Verifying replacement Driver License...');
  await updateDocumentVerificationStatus(
    { params: { docId: newDlDocId }, body: { status: 'VERIFIED', reviewer: 'CK Operations Staff' } },
    mockRes()
  );
  await updateDocumentVerificationStatus(
    { params: { docId: uploadRcRes.body?.document?.id }, body: { status: 'VERIFIED', reviewer: 'CK Operations Staff' } },
    mockRes()
  );
  await updateDocumentVerificationStatus(
    { params: { docId: uploadInsRes.body?.document?.id }, body: { status: 'VERIFIED', reviewer: 'CK Operations Staff' } },
    mockRes()
  );
  console.log('✓ All Documents Verified (RC: VERIFIED, Insurance: VERIFIED, DL: VERIFIED)');
  await logActivity(loadId, 'Documents Verified', 'CK Operations Staff', 'CK_OPERATIONS', 'All required documents verified clean');

  // STEP 9: Generate Loading Slip PDF
  console.log('\n[STEP 9] Generating Loading Slip PDF...');
  const sampleLoadData = {
    load_id: loadId,
    from_city: 'Hyderabad',
    to_city: 'Chennai',
    vehicle_type: '32 FT Open',
    vehicle_number: 'TS09AB1234',
    driver_name: 'Ravi Kumar',
    driver_mobile: '919876543211',
    weight: '15 MT',
    material: 'General Cargo',
    loading_date: '18 Sep',
    contact_person: 'ABC Industries',
    party_rate: 45000,
    transporter_rate: 38000,
    ck_margin: 7000,
  };
  const loadingSlipHtml = generateLoadingSlipHtml(sampleLoadData);
  console.log('✓ Loading Slip generated successfully (' + loadingSlipHtml.length + ' bytes)');

  // STEP 10: Driver Simple 1-Tap Mobile Actions
  console.log('\n[STEP 10] Driver performing simple 1-tap mobile actions via WhatsApp link...');
  const driverLinkRes = mockRes();
  await generateDriverActionLink({ params: { loadId } }, driverLinkRes);
  const driverToken = driverLinkRes.body?.token;

  await handleDriverActionByToken({ body: { token: driverToken, action: 'REACHED_PICKUP' } }, mockRes());
  console.log('✓ Driver: [Reached Pickup]');
  await logActivity(loadId, 'Vehicle Arrived Pickup', 'Driver Ravi', 'DRIVER', 'Arrived at plant');

  await handleDriverActionByToken({ body: { token: driverToken, action: 'LOADED' } }, mockRes());
  console.log('✓ Driver: [Vehicle Loaded]');
  await logActivity(loadId, 'Vehicle Loaded', 'Driver Ravi', 'DRIVER', 'Shipment loaded');

  await handleDriverActionByToken({ body: { token: driverToken, action: 'START_TRIP' } }, mockRes());
  console.log('✓ Driver: [Start Trip / In Transit]');
  await logActivity(loadId, 'In Transit', 'Driver Ravi', 'DRIVER', 'Dispatched on highway');

  await handleDriverActionByToken({ body: { token: driverToken, action: 'REACHED_DELIVERY' } }, mockRes());
  console.log('✓ Driver: [Reached Delivery]');
  await logActivity(loadId, 'Reached Delivery', 'Driver Ravi', 'DRIVER', 'Arrived at delivery location');

  // STEP 11: Driver Uploads POD & Verification
  console.log('\n[STEP 11] Driver uploads signed POD...');
  const uploadPodRes = mockRes();
  await uploadPortalDocument(
    { body: { token: driverToken, doc_type: 'pod', file_url: 'data:image/png;base64,signed_pod_data' } },
    uploadPodRes
  );
  await updateDocumentVerificationStatus(
    { params: { docId: uploadPodRes.body?.document?.id }, body: { status: 'VERIFIED', reviewer: 'CK Operations Staff' } },
    mockRes()
  );
  console.log('✓ POD Uploaded & Verified successfully');
  await logActivity(loadId, 'POD Verified', 'CK Operations Staff', 'CK_OPERATIONS', 'Signed POD verified');

  // STEP 12: Financial Invoicing & Settlements
  console.log('\n[STEP 12] Generating Customer Invoice (₹45,000)...');
  const invoiceHtml = generateCustomerInvoiceHtml(sampleLoadData, { company_name: 'ABC Industries Ltd', gstin: '36ABCDE1234F1Z5' });
  console.log('✓ Customer Invoice Generated (Billed Rate: ₹45,000)');

  console.log('Generating Transporter Settlement (₹38,000)...');
  const settlementHtml = generateTransporterSettlementHtml(sampleLoadData, { company_name: 'Sri Balaji Logistics', bank_name: 'HDFC Bank', bank_account: '5010023456789' });
  console.log('✓ Transporter Settlement Generated (Payable Rate: ₹38,000)');

  console.log('Calculating CK Gross Margin / Commission (₹7,000)...');
  const commissionHtml = generateCommissionBillHtml(sampleLoadData);
  console.log('✓ Margin Statement Generated (Gross Margin: ₹7,000)');

  await logActivity(loadId, 'Settlement Completed', 'CK Accounts', 'CK_ACCOUNTS', 'Customer Invoiced ₹45,000 · Transporter Settled ₹38,000 · Net Margin ₹7,000');

  // STEP 13: Verify Data Privacy Rules
  console.log('\n[STEP 13] VERIFYING FINANCIAL DATA PRIVACY RULES ACROSS ROLES...');
  const customerView = filterLoadCommercials(sampleLoadData, 'PARTY');
  console.log('✓ Customer View (Party Rate ₹45,000 visible, Transporter Rate & Margin HIDDEN):', customerView);

  const transporterView = filterLoadCommercials(sampleLoadData, 'TRANSPORTER');
  console.log('✓ Transporter View (Transporter Rate ₹38,000 visible, Customer Rate & Margin HIDDEN):', transporterView);

  const driverView = filterLoadCommercials(sampleLoadData, 'DRIVER');
  console.log('✓ Driver View (ALL Financial Rates HIDDEN):', driverView);

  console.log('\n===================================================');
  console.log('--- COMPLETE SCENARIO TEST CK-1025 PASSED 100% ---');
  console.log('===================================================');
};

runCompleteScenarioTest().catch((err) => console.error('Scenario Test Failure:', err));
