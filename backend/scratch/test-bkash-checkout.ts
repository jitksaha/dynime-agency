import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const port = process.env.PORT || 3001;
  const url = `http://localhost:${port}/api/v1/orders/public/process-payment`;

  console.log(`Sending process-payment request to NestJS server at ${url}...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gateway: 'bkash',
        customer_name: 'Test Customer',
        customer_email: 'customer@example.com',
        items: [{ id: 'starter', name: 'Web Design - Test', price: 0.01, quantity: 1 }],
        total: 0.01,
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log('Server Response Status:', res.status);
    console.log('Server Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
  }
}

main();
