const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const API_BASE_URL = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v25.0';
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function checkTemplates() {
  try {
    const response = await axios.get(`${API_BASE_URL}/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates`, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error fetching templates:', error.response?.data || error.message);
  }
}

checkTemplates();
