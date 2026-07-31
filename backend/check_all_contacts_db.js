const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const contactsRes = await axios.get(`${base}/contacts`);

  console.log('All Contacts Currently in System:');
  console.log(JSON.stringify(contactsRes.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
