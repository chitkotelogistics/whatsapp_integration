const axios = require('axios');

(async () => {
  const base = 'http://localhost:5000/api';

  console.log('1. Fetching approved templates...');
  try {
    const templatesRes = await axios.get(`${base}/templates`);
    console.log('Available templates:', JSON.stringify(templatesRes.data, null, 2));
  } catch (err) {
    console.error('Templates error:', err.response?.data || err.message);
  }

  console.log('\n2. Testing send with hello_world template...');
  try {
    const sendRes = await axios.post(`${base}/test-message`, {
      contacts: ['919441510824'],
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' }
      }
    });
    console.log('Template Send API Response:', JSON.stringify(sendRes.data, null, 2));
  } catch (err) {
    console.error('Template send error:', err.response?.data || err.message);
  }
})().catch(err => {
  console.error('Unexpected error:', err.message);
});
