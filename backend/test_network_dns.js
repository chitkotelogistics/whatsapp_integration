const axios = require('axios');

(async () => {
  console.log('Testing DNS & Network connection to https://graph.facebook.com...');
  try {
    const res = await axios.get('https://graph.facebook.com');
    console.log('Graph Facebook Network Test Response:', res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.log('Connected to Meta Graph API successfully! Response code:', err.response.status);
    } else {
      console.error('DNS Network Error:', err.message);
    }
  }
})().catch(err => {
  console.error('Fatal error:', err.message);
});
