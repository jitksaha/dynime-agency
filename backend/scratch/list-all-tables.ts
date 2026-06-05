import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listTables() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Listing database tables and counts ---');
    
    // We can run a raw SQL query to get all user tables and row counts in the public schema
    const result: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        schemaname, 
        relname AS table_name, 
        n_live_tup AS row_count
      FROM 
        pg_stat_user_tables
      WHERE 
        schemaname = 'public'
      ORDER BY 
        row_count DESC;
    `);

    for (const row of result) {
      console.log(`Table: ${row.table_name}, Schema: ${row.schemaname}, Rows: ${row.row_count}`);
    }
  } catch (err) {
    console.error('Error fetching tables:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listTables();
