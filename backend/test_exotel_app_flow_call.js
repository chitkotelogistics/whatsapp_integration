const axios = require('axios');
const querystring = require('querystring');

async function testExotelAppFlowCall() {
  const sid = 'chitkotelogistics1';
  const apiKey = '65ffb1f4a08ea9873abf4c8d1ae1255a0e44f258097d6142';
  const apiToken = 'ef59f2a5022e0f59d0b4cf67e45bc358363606f466bc1ed9';
  const callerId = '02048564809';
  const appId = '1304942';

  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
  
  const payloadObj = {
    From: '09730361798',
    CallerId: callerId,
    Url: `http://my.exotel.com/${sid}/exomls/start_voice/${appId}`,
    CallType: 'transient',
  };

  console.log('--- TESTING OFFICIAL EXOTEL APP FLOW CALL ---');
  console.log('Payload:', payloadObj);

  try {
    const postData = querystring.stringify(payloadObj);
    const res = await axios.post(`https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`, postData, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('\n✅ EXOTEL RESPONSE:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\n❌ ERROR:', err.response?.data || err.message);
  }
}

testExotelAppFlowCall();
