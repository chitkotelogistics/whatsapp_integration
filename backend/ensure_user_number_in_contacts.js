const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';
  const contactsRes = await axios.get(`${base}/contacts`);
  const contacts = contactsRes.data || [];

  const found = contacts.find(c => String(c.mobile).includes('9730361798'));
  if (!found) {
    console.log('Adding 9730361798 contact...');
    await axios.post(`${base}/contacts`, {
      name: 'Primary Recipient (9730361798)',
      mobile: '9730361798',
      company: 'Chitkote Logistics',
      city: 'Chennai',
      state: 'Tamil Nadu',
      vehicleType: 'Container 32FT'
    });
  }

  const updatedContacts = await axios.get(`${base}/contacts`);
  console.log('Current Contacts List:');
  console.log(JSON.stringify(updatedContacts.data, null, 2));
})().catch(err => {
  console.error('Error:', err.message);
});
