const axios = require('axios');
const querystring = require('querystring');

async function testExotelCall() {
  const sid = 'chitkotelogistics1';
  const apiKey = '65ffb1f4a08ea9873abf4c8d1ae1255a0e44f258097d6142';
  const apiToken = 'ef59f2a5022e0f59d0b4cf67e45bc358363606f466bc1ed9';
  const callerId = '02048564809';
  const appId = '1304908';

  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
  const postData = querystring.stringify({
    From: '09730361798',
    CallerId: callerId,
    Url: `http://my.exotel.com/${sid}/exomls/start_voice/${appId}`,
  });

  console.log('--- PLACING MANUAL TEST EXOTEL CALL ---');
  console.log('Target Phone:', '09730361798');
  console.log('Caller ID:', callerId);
  console.log('App URL:', `http://my.exotel.com/${sid}/exomls/start_voice/${appId}`);

  try {
    const res = await axios.post(`https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`, postData, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('\n✅ EXOTEL CALL CONNECT API RESPONSE:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\n❌ EXOTEL CALL ERROR:');
    console.error(err.response?.data || err.message);
  }
}

testExotelCall();
