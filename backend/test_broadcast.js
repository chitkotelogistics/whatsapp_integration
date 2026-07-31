const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/broadcast', { contactIds: [1784741708957, 1], message: 'Test send load message' }, { timeout: 20000 });
    console.log('OK', JSON.stringify(res.data, null, 2));
  } catch (e) {
    if (e.response && e.response.data) {
      console.error('ERR', JSON.stringify(e.response.data, null, 2));
    } else {
      console.error('ERR', e.message);
    }
    process.exit(1);
  }
})();
