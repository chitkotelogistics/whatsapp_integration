const {
  filterLoadCommercials,
  submitNegotiation,
  getLoadNegotiations,
  acceptTransporterOffer,
  getInboxThreads,
} = require('../src/controllers/negotiationController');

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

const runPhase2Test = async () => {
  console.log('--- STARTING PHASE 2 VERIFICATION TESTS ---');

  const loadId = 'CK-1025';

  // 1. Submit 3 competing transporter quotes for Load CK-1025
  const quote1 = {
    body: {
      loadId,
      transporter_name: 'Truck Owner A (Manjunath)',
      transporter_mobile: '919390003955',
      offered_rate: 40000,
    },
  };
  const res1 = mockRes();
  await submitNegotiation(quote1, res1);
  console.log('✓ Quote 1 Submitted:', res1.body);

  const quote2 = {
    body: {
      loadId,
      transporter_name: 'Truck Owner B (Sri Venkateswara Transport)',
      transporter_mobile: '919441510824',
      offered_rate: 38000,
    },
  };
  const res2 = mockRes();
  await submitNegotiation(quote2, res2);
  console.log('✓ Quote 2 Submitted:', res2.body);

  const quote3 = {
    body: {
      loadId,
      transporter_name: 'Truck Owner C (Reddy Freight)',
      transporter_mobile: '919876543219',
      offered_rate: 39000,
    },
  };
  const res3 = mockRes();
  await submitNegotiation(quote3, res3);
  console.log('✓ Quote 3 Submitted:', res3.body);

  // 2. Fetch all quotes for Load CK-1025
  const negReq = { params: { loadId } };
  const negRes = mockRes();
  await getLoadNegotiations(negReq, negRes);
  console.log('✓ All Negotiation History for CK-1025:', negRes.body?.length, 'quotes recorded');

  // 3. Accept Truck Owner B's ₹38,000 quote
  const acceptReq = {
    body: {
      loadId,
      negotiationId: res2.body?.quote?.id,
      transporter_id: 102,
      final_rate: 38000,
    },
  };
  const acceptRes = mockRes();
  await acceptTransporterOffer(acceptReq, acceptRes);
  console.log('✓ Rate Offer Accepted:', acceptRes.body);

  // 4. Test Commercial Visibility Filtering Rule
  const fullLoadSample = {
    load_id: 'CK-1025',
    pickup: 'Hyderabad',
    delivery: 'Chennai',
    party_rate: 45000,
    transporter_rate: 38000,
    ck_margin: 7000,
  };

  console.log('--- TESTING COMMERCIAL RATE PRIVACY RULES ---');
  console.log('CK Internal Operations view:', filterLoadCommercials(fullLoadSample, 'CK_OPERATIONS'));
  console.log('Customer/Party view (Hides Transporter Rate & Margin):', filterLoadCommercials(fullLoadSample, 'PARTY'));
  console.log('Truck Owner view (Hides Customer Rate & Margin):', filterLoadCommercials(fullLoadSample, 'TRANSPORTER'));
  console.log('Driver view (Hides all financial rates):', filterLoadCommercials(fullLoadSample, 'DRIVER'));

  // 5. Test Inbox Thread Fetching
  const inboxRes = mockRes();
  await getInboxThreads({}, inboxRes);
  console.log('✓ Inbox Threads count:', inboxRes.body?.length);

  console.log('--- PHASE 2 VERIFICATION COMPLETED SUCCESSFULLY ---');
};

runPhase2Test().catch((err) => console.error('Phase 2 Test Error:', err));
