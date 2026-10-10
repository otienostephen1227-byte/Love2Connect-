// Check payment status
// Client polls this endpoint instead of calling Daraja directly

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { transactionId, userId } = JSON.parse(event.body);

    if (!transactionId || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing transactionId or userId' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase configuration' })
      };
    }

    // Check if payment exists in Supabase
    const response = await fetch(
      `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${encodeURIComponent(transactionId)}&user_id=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to check payment status' })
      };
    }

    const data = await response.json();

    if (data.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'pending',
          message: 'Payment not yet received'
        })
      };
    }

    const payment = data[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: payment.status,
        credits: payment.credits,
        amount: payment.amount,
        mpesaCode: payment.mpesa_code,
        message: payment.status === 'completed' ? `${payment.credits} credits added!` : 'Payment processing'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
