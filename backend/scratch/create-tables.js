const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database and creating verification tables (one-by-one)...');
  
  const statements = [
    `CREATE TABLE IF NOT EXISTS public.verification_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        company_id UUID,
        service_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
        compliance_case_id UUID,
        didit_session_id VARCHAR(255) UNIQUE,
        workflow_id VARCHAR(255),
        verification_url TEXT,
        qr_code_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        decision VARCHAR(50),
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS verification_requests_didit_session_id_idx ON public.verification_requests(didit_session_id)`,
    `CREATE INDEX IF NOT EXISTS verification_requests_customer_id_idx ON public.verification_requests(customer_id)`,
    `CREATE INDEX IF NOT EXISTS verification_requests_company_id_idx ON public.verification_requests(company_id)`,
    `CREATE INDEX IF NOT EXISTS verification_requests_service_order_id_idx ON public.verification_requests(service_order_id)`,
    `CREATE TABLE IF NOT EXISTS public.verification_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        verification_request_id UUID NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
        webhook_type VARCHAR(255) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS public.verification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        verification_request_id UUID NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    )`
  ];

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log('Executed statement successfully.');
    } catch (err) {
      console.error('Error executing statement:', stmt, err);
    }
  }

  await prisma.$disconnect();
}

main();
