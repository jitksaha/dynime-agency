import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('Connecting to database and running raw DDL migrations...');

  try {
    // 1. Add referral_code to orders if it does not exist
    console.log('Checking orders table for referral_code column...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'referral_code'
        ) THEN
          ALTER TABLE public.orders ADD COLUMN referral_code VARCHAR(255);
          RAISE NOTICE 'Added referral_code column to orders';
        ELSE
          RAISE NOTICE 'referral_code column already exists in orders';
        END IF;
      END $$;
    `);

    // 2. Create partners table
    console.log('Creating partners table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        referral_code VARCHAR(255) UNIQUE NOT NULL,
        commission_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        commission_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_referrals INT NOT NULL DEFAULT 0,
        total_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tier VARCHAR(50) NOT NULL DEFAULT 'standard',
        commission_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);

    // 3. Create referrals table
    console.log('Creating referrals table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
        referral_code VARCHAR(255) NOT NULL,
        visitor_ip VARCHAR(100),
        device_fingerprint VARCHAR(255),
        landing_page TEXT,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        cookie_id VARCHAR(255) UNIQUE,
        converted BOOLEAN NOT NULL DEFAULT FALSE,
        order_id UUID,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        last_visit TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);
    
    // Index on partner_id
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_referrals_partner_id ON public.referrals(partner_id)
    `);

    // 4. Create payouts table
    console.log('Creating payouts table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payout_method VARCHAR(100) NOT NULL,
        details JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        transaction_id VARCHAR(255),
        paid_at TIMESTAMPTZ(6),
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);

    // 5. Create commissions table
    console.log('Creating commissions table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
        customer_id UUID,
        service_name VARCHAR(255) NOT NULL,
        order_amount DECIMAL(10,2) NOT NULL,
        profit_amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        approved_at TIMESTAMPTZ(6),
        paid_at TIMESTAMPTZ(6),
        payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);

    // Index on partner_id, order_id, payout_id
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_commissions_partner_id ON public.commissions(partner_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON public.commissions(order_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_commissions_payout_id ON public.commissions(payout_id)
    `);

    // 6. Create commission_rules table
    console.log('Creating commission_rules table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.commission_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        min_amount DECIMAL(10,2) NOT NULL,
        max_amount DECIMAL(10,2) NOT NULL,
        commission DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      )
    `);

    // 7. Seed default commission rules if empty
    console.log('Seeding default commission rules...');
    const countResult = await prisma.$queryRawUnsafe<any[]>(
      'SELECT COUNT(*) as count FROM public.commission_rules'
    );
    const rulesCount = parseInt(countResult[0]?.count ?? '0', 10);
    if (rulesCount === 0) {
      const defaultRules = [
        { min: 100, max: 500, comm: 5 },
        { min: 500, max: 1000, comm: 10 },
        { min: 1000, max: 2000, comm: 20 },
        { min: 2000, max: 3000, comm: 30 },
        { min: 3000, max: 4000, comm: 40 },
        { min: 4000, max: 5000, comm: 50 },
        { min: 5000, max: 99999999, comm: 100 }
      ];

      for (const rule of defaultRules) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO public.commission_rules (min_amount, max_amount, commission) VALUES ($1, $2, $3)',
          rule.min, rule.max, rule.comm
        );
      }
      console.log('Default rules seeded successfully.');
    } else {
      console.log('commission_rules already has records, skipping seed.');
    }

    console.log('SUCCESS! All DDL migrations ran perfectly.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
