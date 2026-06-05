import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.DIDIT_API_KEY;
const workflowId = process.env.DIDIT_KYC_WORKFLOW_ID;

async function testLiveSession() {
  console.log('--- Testing Didit Live Session Creation ---');
  console.log('DIDIT_API_KEY:', apiKey ? `${apiKey.substring(0, 5)}...` : 'Not Set');
  console.log('DIDIT_KYC_WORKFLOW_ID:', workflowId);

  if (!apiKey || !workflowId) {
    console.error('Error: DIDIT_API_KEY or DIDIT_KYC_WORKFLOW_ID is missing from .env');
    process.exit(1);
  }

  const payload = {
    workflow_id: workflowId,
    vendor_data: 'test-user-12345',
    callback: 'http://localhost:5001/verify-order/test-order?done=1',
    metadata: {
      user_id: 'test-user-12345',
      email: 'test@dynime.com',
      service_order_id: 'test-order-id',
    }
  };

  try {
    const res = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log('Response HTTP Status:', res.status);
    const bodyText = await res.text();
    console.log('Raw Response Body:', bodyText);

    if (res.ok) {
      const data = JSON.parse(bodyText);
      console.log('\nSUCCESS! Created live Didit verification session.');
      console.log('Session ID:', data.session_id || data.id);
      console.log('Verification URL:', data.verification_url || data.url || data.session_url);
    } else {
      console.error('Failed to create session:', bodyText);
    }
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

testLiveSession();
