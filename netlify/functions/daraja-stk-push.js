// Initiate STK Push payment request
// Runs server-side to keep Daraja credentials secure

const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { phoneNumber, amount, userId, transactionId } = JSON.parse(event.body);

    // Validate inputs
    if (!phoneNumber || !amount || !userId || !transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate phone format (should be 254-prefixed)
    if (!phoneNumber.startsWith('254') || phoneNumber.length !== 12) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid phone format. Use 254XXXXXXXXX' })
      };
    }

    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    const shortcode = process.env.DARAJA_SHORTCODE;
    const passkey = process.env.DARAJA_PASSKEY;
    const callbackUrl = process.env.DARAJA_CALLBACK_URL;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Daraja configuration' })
      };
    }

    // Get token first
    const token = await getToken(consumerKey, consumerSecret);

    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to get auth token' })
      };
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    // Build STK Push payload
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: transactionId,
      TransactionDesc: `Buy ${amount === 10 ? '50' : Math.round(amount * 5)} Love2Connect credits`
    };

    // Send to Daraja
    return new Promise((resolve) => {
      const options = {
        hostname: 'sandbox.safaricom.co.ke',
        port: 443,
        path: '/mpesa/stkpush/v1/processrequest',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
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
              body: JSON.stringify({ error: 'Failed to parse response' })
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

      req.write(JSON.stringify(payload));
      req.end();
    });
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper to get Daraja token
function getToken(consumerKey, consumerSecret) {
  return new Promise((resolve) => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

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
          resolve(response.access_token);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}
