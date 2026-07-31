const { sendMessage } = require('./src/services/whatsappService');
const axios = require('axios');

async function testSend() {
  const s = await axios.get('https://whatsapp-integration-8aoz.onrender.com/api/settings');
  const config = { PHONE_NUMBER_ID: s.data.phone_number_id, ACCESS_TOKEN: s.data.access_token };

  console.log('--- TEST 1: Sending Freeform Text Message ---');
  try {
    const rText = await sendMessage(config, {
      to: '9730361798',
      type: 'text',
      message: '*🚚 Chitkote Logistics Load Available*\n\n📍 Pickup City: Hyderabad\n📍 Delivery City: Chennai\n🚚 Vehicle Type Required: 32 FT Open Truck\n⚖️ Shipment Weight: 25 Tons\n💰 Agreed Freight Rate: 42000\n📞 Direct Contact Phone: 9390003955\n\nPlease call or reply to this message if you are available to accept this load.',
    });
    console.log('Text Message Response:', JSON.stringify(rText, null, 2));
  } catch (errText) {
    console.error('Text Message Failed:', errText.response?.data || errText.message);
  }

  console.log('\n--- TEST 2: Sending Template Message (load_dispatch) ---');
  try {
    const rTemplate = await sendMessage(config, {
      to: '9730361798',
      type: 'template',
      template: {
        name: 'load_dispatch',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Hyderabad' },
              { type: 'text', text: 'Chennai' },
              { type: 'text', text: '32 FT Open Truck' },
              { type: 'text', text: '25 Tons' },
              { type: 'text', text: '42000' },
              { type: 'text', text: '9390003955' },
            ],
          },
        ],
      },
    });
    console.log('Template Message Response:', JSON.stringify(rTemplate, null, 2));
  } catch (errTpl) {
    console.error('Template Message Failed:', errTpl.response?.data || errTpl.message);
  }
}

testSend();
