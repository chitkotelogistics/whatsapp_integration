const axios = require('axios');
const querystring = require('querystring');

async function testVariants() {
  const sid = 'chitkotelogistics1';
  const apiKey = '65ffb1f4a08ea9873abf4c8d1ae1255a0e44f258097d6142';
  const apiToken = 'ef59f2a5022e0f59d0b4cf67e45bc358363606f466bc1ed9';
  const callerId = '02048564809';
  const appId = '1304908';
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

  console.log('--- TEST 1: Using App ID directly as To parameter ---');
  try {
    const postData1 = querystring.stringify({
      From: '09730361798',
      To: appId,
      CallerId: callerId,
    });
    const res1 = await axios.post(`https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`, postData1, {
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('Result 1 (To = AppId):', res1.data);
  } catch (err) {
    console.log('Error 1:', err.response?.data || err.message);
  }
}

testVariants();
