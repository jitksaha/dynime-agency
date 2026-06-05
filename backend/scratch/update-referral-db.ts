import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  console.log('Connecting to database and executing target DDL alterations...');

  try {
    // 1. Add parent_partner_id to public.partners
    console.log('Checking for parent_partner_id in public.partners...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'partners' 
            AND column_name = 'parent_partner_id'
        ) THEN
          ALTER TABLE public.partners ADD COLUMN parent_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;
          RAISE NOTICE 'Added parent_partner_id column to public.partners';
        ELSE
          RAISE NOTICE 'parent_partner_id column already exists';
        END IF;
      END $$;
    `);

    // 2. Add parent_commission_share to public.partners
    console.log('Checking for parent_commission_share in public.partners...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'partners' 
            AND column_name = 'parent_commission_share'
        ) THEN
          ALTER TABLE public.partners ADD COLUMN parent_commission_share DECIMAL(3,2) NOT NULL DEFAULT 0.10;
          RAISE NOTICE 'Added parent_commission_share column to public.partners';
        ELSE
          RAISE NOTICE 'parent_commission_share column already exists';
        END IF;
      END $$;
    `);

    // 3. Add commission_type to public.commissions
    console.log('Checking for commission_type in public.commissions...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'commissions' 
            AND column_name = 'commission_type'
        ) THEN
          ALTER TABLE public.commissions ADD COLUMN commission_type VARCHAR(50) NOT NULL DEFAULT 'standard';
          RAISE NOTICE 'Added commission_type column to public.commissions';
        ELSE
          RAISE NOTICE 'commission_type column already exists';
        END IF;
      END $$;
    `);

    console.log('SUCCESS! All target referral DB DDL updates complete.');

  } catch (error) {
    console.error('Migration execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
