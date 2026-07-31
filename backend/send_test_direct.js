const { sendMessage } = require('./src/services/whatsappService');
const { getSettingsConfig } = require('./src/services/settingsService');
const { formatWhatsAppMessage } = require('./src/utils/helpers');

(async () => {
  try {
    const config = await getSettingsConfig();
    const messageText = formatWhatsAppMessage({
      from: 'Marikal',
      to: 'Coimbatore',
      vehicleType: '12tyer',
      weight: '25mt',
      freight: '60000',
      contactNumber: '9000006942'
    });

    console.log('Sending formatted test load message to 9730361798...\n');
    console.log('--- Message Content ---');
    console.log(messageText);
    console.log('-----------------------\n');

    const response = await sendMessage(config, {
      to: '919730361798',
      message: messageText,
      type: 'text'
    });

    console.log('✅ Message delivery response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
})();
