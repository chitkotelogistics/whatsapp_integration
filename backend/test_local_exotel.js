const http = require('http');
const axios = require('axios');
const querystring = require('querystring');

// 1. Create a local HTTP server to receive Exotel's Passthru request
const server = http.createServer((req, res) => {
  console.log(`\n[LOCAL SERVER] Received ${req.method} request to ${req.url}`);
  
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    console.log('[LOCAL SERVER] Headers:', req.headers);
    console.log('[LOCAL SERVER] Query/Body:', body || req.url);

    // Return Exotel-compatible Passthru XML response
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="female" language="hi-IN">Namaste! Chitkote Logistics se Nayi Load Available Hai. Kripya WhatsApp par sampark karein.</Say>
</Response>`);
  });
});

server.listen(5005, async () => {
  console.log('Local test server running on port 5005...');
  
  // Test making Exotel API call using a public ngrok or local test URL
  const sid = 'chitkotelogistics1';
  const apiKey = '65ffb1f4a08ea9873abf4c8d1ae1255a0e44f258097d6142';
  const apiToken = 'ef59f2a5022e0f59d0b4cf67e45bc358363606f466bc1ed9';
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

  console.log('\nTesting Exotel Account API details...');
  try {
    const res = await axios.get(`https://api.exotel.com/v1/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('Exotel Account Status:', res.data?.Account?.Status, 'KYC:', res.data?.Account?.KycStatus);
  } catch (e) {
    console.error('Account Check Error:', e.message);
  }
});
