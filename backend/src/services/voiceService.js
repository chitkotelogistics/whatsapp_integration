const axios = require('axios');
const querystring = require('querystring');
const db = require('../config/db');
const { getSettingsConfig } = require('../controllers/whatsappController');

const getExotelConfig = async () => {
  const settings = await getSettingsConfig();

  const accountSid = process.env.EXOTEL_ACCOUNT_SID || settings.EXOTEL_ACCOUNT_SID || 'chitkotelogistics1';
  const apiKey = process.env.EXOTEL_API_KEY || settings.EXOTEL_API_KEY || '65ffb1f4a08ea9873abf4c8d1ae1255a0e44f258097d6142';
  const apiToken = process.env.EXOTEL_API_TOKEN || settings.EXOTEL_API_TOKEN || 'ef59f2a5022e0f59d0b4cf67e45bc358363606f466bc1ed9';
  const callerId = process.env.EXOTEL_CALLER_ID || settings.EXOTEL_CALLER_ID || '02048564809';
  const appId = process.env.EXOTEL_APP_ID || settings.EXOTEL_APP_ID || '1304942';
  const subdomain = settings.EXOTEL_SUBDOMAIN || 'api.exotel.com';

  return { accountSid, apiKey, apiToken, callerId, appId, subdomain };
};

const formatExotelPhone = (phone = '') => {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `0${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `0${cleaned.slice(2)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned;
  }
  return cleaned ? `0${cleaned.slice(-10)}` : '';
};

const initiateExotelCall = async (targetPhone, customAppId = null, customField = '') => {
  const config = await getExotelConfig();
  const formattedTo = formatExotelPhone(targetPhone);

  if (!formattedTo) {
    throw new Error(`Invalid mobile number for Exotel call: ${targetPhone}`);
  }

  const auth = Buffer.from(`${config.apiKey}:${config.apiToken}`).toString('base64');
  const appId = customAppId || config.appId;

  const passthruUrl = `https://whatsapp-integration-8aoz.onrender.com/api/voice/passthru`;
  const flowUrl = `https://my.exotel.com/${config.accountSid}/exomls/start_voice/${appId}`;

  const payloadObj = {
    From: formattedTo,
    CallerId: config.callerId,
    Url: `http://my.exotel.com/${config.accountSid}/exomls/start_voice/${appId}`,
    CallType: 'transient',
    StatusCallback: 'https://whatsapp-integration-8aoz.onrender.com/api/voice/webhook',
  };

  if (customField) {
    payloadObj.CustomField = String(customField);
  }

  const postData = querystring.stringify(payloadObj);
  const url = `https://${config.subdomain}/v1/Accounts/${config.accountSid}/Calls/connect.json`;

  const response = await axios.post(url, postData, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};

module.exports = {
  getExotelConfig,
  formatExotelPhone,
  initiateExotelCall,
};
