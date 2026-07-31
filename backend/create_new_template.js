const axios = require('axios');

async function main() {
  const wabaId = '1568445654798459';
  const token = 'EAAW2Kf1eCwwBSCg6FhfZCrcSgRpl1IpjIqO70iODuIjEmjZAHZCNF7xjeRiZCdKQK0voFTQ1KF3Y4YFxXtWzWQWmMZCcgstzEMOuuP8R1iFu4gWbM0N141M8NTO9GU5wJ9OgurfPE2DMrorjWXVGKh3PG4JwpiO557ZCcpo0QtuPSTzwNeFAPYvu6A95qkAUrQ3Bf1MLG8EZB78oYfzoJO3PUCFhUrOjZBAx5qwb';

  console.log('Creating new clean Meta template chitkote_load_alert for WABA:', wabaId);

  try {
    const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates`;
    const payload = {
      name: 'chitkote_load_alert',
      category: 'UTILITY',
      language: 'en',
      components: [
        {
          type: 'BODY',
          text: '*🚚 Chitkote Logistics Load Available*\n\n📍 Pickup City: {{1}}\n📍 Delivery City: {{2}}\n🚚 Vehicle Type Required: {{3}}\n⚖️ Shipment Weight: {{4}}\n💰 Agreed Freight Rate: {{5}}\n📞 Direct Contact Phone: {{6}}\n\nPlease call or reply to this message if you are available to accept this load.',
          example: {
            body_text: [['Hyderabad', 'Chennai', '32 FT Open Truck', '25 Tons', '42000', '9390003955']],
          },
        },
      ],
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Template Created Successfully! Response:', res.data);
  } catch (error) {
    console.error('Error creating template:', error.response?.data || error.message);
  }
}

main();
