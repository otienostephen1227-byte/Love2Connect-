// Get OAuth token from Safaricom Daraja
// This runs server-side, so credentials are never exposed to the browser

const https = require('https');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Daraja credentials in environment' })
    };
  }

  // Base64 encode credentials
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  return new Promise((resolve) => {
    const options = {
      hostname: 'sandbox.safaricom.co.ke',
      port: 443,
      path: '/oauth/v1/generate?grant_type=client_credentials',
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to parse token response' })
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });

    req.end();
  });
};
