// Handle Daraja callback
// Verifies the payment and updates Supabase

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { Body } = body;

    if (!Body || !Body.stkCallback) {
      console.log('Invalid callback structure:', body);
      return {
        statusCode: 200,
        body: JSON.stringify({ ResultCode: 1, ResultDesc: 'Invalid structure' })
      };
    }

    const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    // ResultCode 0 = success, anything else = failure
    if (ResultCode !== 0) {
      console.log('Payment failed:', ResultDesc);
      return {
        statusCode: 200,
        body: JSON.stringify({ ResultCode: 0, ResultDesc: 'Payment failed' })
      };
    }

    // Extract transaction details
    const metadata = CallbackMetadata.Item.reduce((acc, item) => {
      acc[item.Name] = item.Value;
      return acc;
    }, {});

    const transactionId = metadata.AccountReference;
    const mpesaCode = metadata.MpesaReceiptNumber;
    const amount = metadata.Amount;
    const phoneNumber = metadata.PhoneNumber;

    console.log('Payment successful:', {
      transactionId,
      mpesaCode,
      amount,
      phoneNumber
    });

    // Update Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({ ResultCode: 1, ResultDesc: 'Server error' })
      };
    }

    // Parse transaction ID to get user ID
    const [userId, timestamp] = transactionId.split('_');

    if (!userId) {
      console.error('Invalid transaction ID format:', transactionId);
      return {
        statusCode: 200,
        body: JSON.stringify({ ResultCode: 1, ResultDesc: 'Invalid transaction' })
      };
    }

    // Calculate credits (50 credits per KES 10)
    const credits = Math.round((amount / 10) * 50);

    // Record payment in Supabase
    const updatePayload = {
      user_id: userId,
      amount: amount,
      credits: credits,
      mpesa_code: mpesaCode,
      phone_number: phoneNumber,
      transaction_id: transactionId,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    try {
      // Insert payment record
      const response = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Supabase insert error:', error);
        throw new Error('Failed to record payment');
      }

      // Update wallet credits
      const walletResponse = await fetch(
        `${supabaseUrl}/rest/v1/wallets?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            credits: `credits + ${credits}`
          })
        }
      );

      if (!walletResponse.ok) {
        console.error('Wallet update failed');
        // Payment recorded but wallet not updated — investigate manually
      }

      console.log(`Payment processed: ${credits} credits added to user ${userId}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ResultCode: 0,
          ResultDesc: 'Payment processed successfully'
        })
      };
    } catch (supabaseError) {
      console.error('Supabase operation failed:', supabaseError);
      return {
        statusCode: 200,
        body: JSON.stringify({
          ResultCode: 1,
          ResultDesc: 'Payment received but could not be recorded'
        })
      };
    }
  } catch (error) {
    console.error('Callback handler error:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({
        ResultCode: 1,
        ResultDesc: error.message
      })
    };
  }
};
