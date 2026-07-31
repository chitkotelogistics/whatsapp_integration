const axios = require('axios');
(async () => {
  try {
    const api = axios.create({ baseURL: 'http://localhost:5000/api', timeout: 20000 });
    const contactsRes = await api.get('/contacts');
    const contacts = contactsRes.data || [];
    const matches = contacts.filter(c => (c.mobile || '').replace(/[^0-9]/g, '').endsWith('9390003955'));
    if (!matches.length) return console.error('No contacts found for 9390003955');
    const contactIds = matches.map(c => c.id);

    const loadsRes = await api.get('/loads');
    const loads = loadsRes.data || [];
    if (!loads.length) return console.error('No saved loads found');
    const load = loads[0];

    console.log('Using load:', load.loadId || load.id);

    const body = { contactIds, message: load.message || load.message_body || '' };
    const res = await api.post('/broadcast', body);
    console.log('Broadcast response:', res.data);
  } catch (e) {
    if (e.response && e.response.data) console.error('Error response:', e.response.data);
    else console.error('Error:', e.message);
    process.exit(1);
  }
})();
