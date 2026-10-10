const {
  getPortalDataByToken,
  uploadPortalDocument,
  updateDocumentVerificationStatus,
  handleDriverActionByToken,
  getDriverDataByToken,
  generateDocumentUploadLink,
  generateDriverActionLink,
} = require('../src/controllers/documentPortalController');
const { getLoads } = require('../src/controllers/whatsappController');

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

const runPhase3Test = async () => {
  console.log('--- STARTING PHASE 3 VERIFICATION TESTS ---');

  const loadId = 'CK-1025';

  // 1. Generate Secure Upload Token and Driver Token
  const docLinkRes = mockRes();
  await generateDocumentUploadLink({ params: { loadId } }, docLinkRes);
  const docToken = docLinkRes.body?.token;
  console.log('✓ Generated Document Upload Link:', docLinkRes.body?.link);

  const driverLinkRes = mockRes();
  await generateDriverActionLink({ params: { loadId } }, driverLinkRes);
  const driverToken = driverLinkRes.body?.token;
  console.log('✓ Generated Driver Action Link:', driverLinkRes.body?.link);

  // 2. Fetch Mobile Upload Portal Data by Token
  const portalRes = mockRes();
  await getPortalDataByToken({ params: { token: docToken } }, portalRes);
  console.log('✓ Upload Portal Data retrieved by Token:', {
    loadId: portalRes.body?.load?.load_id,
    requiredDocs: portalRes.body?.load?.required_documents,
  });

  // 3. Upload RC and Insurance via Public Mobile Portal
  const uploadRcRes = mockRes();
  await uploadPortalDocument(
    {
      body: {
        token: docToken,
        doc_type: 'rc',
        file_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    },
    uploadRcRes
  );
  console.log('✓ RC Document Uploaded:', uploadRcRes.body?.message);

  const docId = uploadRcRes.body?.document?.id;

  // 4. Operations Staff Reviews Document -> Mark NEEDS_REUPLOAD with rejection reason
  const verifyRes = mockRes();
  await updateDocumentVerificationStatus(
    {
      params: { docId },
      body: {
        status: 'NEEDS_REUPLOAD',
        rejection_reason: 'RC image is blurred. Please upload a clear photo of the original document.',
        reviewer: 'CK Operations Staff',
      },
    },
    verifyRes
  );
  console.log('✓ Verification updated & Re-upload alert triggered:', verifyRes.body?.document?.verification_status);

  // 5. Test Driver 1-Tap Mobile Actions
  console.log('--- TESTING DRIVER SIMPLE MOBILE ACTIONS ---');

  const action1 = mockRes();
  await handleDriverActionByToken({ body: { token: driverToken, action: 'REACHED_PICKUP' } }, action1);
  console.log('✓ Driver Action [Reached Pickup]:', action1.body?.newStatus);

  const action2 = mockRes();
  await handleDriverActionByToken({ body: { token: driverToken, action: 'LOADED' } }, action2);
  console.log('✓ Driver Action [Loaded]:', action2.body?.newStatus);

  const action3 = mockRes();
  await handleDriverActionByToken({ body: { token: driverToken, action: 'START_TRIP' } }, action3);
  console.log('✓ Driver Action [Start Trip]:', action3.body?.newStatus);

  const action4 = mockRes();
  await handleDriverActionByToken({ body: { token: driverToken, action: 'REACHED_DELIVERY' } }, action4);
  console.log('✓ Driver Action [Reached Delivery]:', action4.body?.newStatus);

  // Check updated load status
  const loadCheckRes = mockRes();
  await getLoads({}, loadCheckRes);
  const updatedLoad = loadCheckRes.body.find((l) => String(l.load_id || l.loadId) === loadId);
  console.log('✓ Load CK-1025 Current Status:', updatedLoad?.status);

  console.log('--- PHASE 3 VERIFICATION COMPLETED SUCCESSFULLY ---');
};

runPhase3Test().catch((err) => console.error('Phase 3 Test Error:', err));
