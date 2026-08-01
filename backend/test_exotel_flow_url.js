const axios = require('axios');

async function testExotelFlowUrl() {
  const sid = 'chitkotelogistics1';
  const appId1 = '1304908';
  const appId2 = '1304942';

  console.log('--- TESTING EXOTEL START_VOICE URLS ---');

  try {
    const url1 = `https://my.exotel.com/${sid}/exomls/start_voice/${appId1}`;
    console.log('Fetching App 1304908:', url1);
    const res1 = await axios.get(url1);
    console.log('Response 1:', res1.status, res1.data);
  } catch (err) {
    console.error('Error 1:', err.response?.status, err.response?.data || err.message);
  }

  try {
    const url2 = `https://my.exotel.com/${sid}/exomls/start_voice/${appId2}`;
    console.log('\nFetching App 1304942:', url2);
    const res2 = await axios.get(url2);
    console.log('Response 2:', res2.status, res2.data);
  } catch (err) {
    console.error('Error 2:', err.response?.status, err.response?.data || err.message);
  }
}

testExotelFlowUrl();
