const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS payouts (
      id VARCHAR(36) PRIMARY KEY,
      partner_id VARCHAR(36) NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(100) NULL,
      payment_details TEXT NULL,
      paid_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS partners (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      referral_code VARCHAR(255) NOT NULL UNIQUE,
      commission_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      commission_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_referrals INT NOT NULL DEFAULT 0,
      total_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tier VARCHAR(50) NOT NULL DEFAULT 'standard',
      commission_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      parent_partner_id VARCHAR(36) NULL,
      parent_commission_share DECIMAL(3,2) NOT NULL DEFAULT 0.10
    )`,
    `CREATE TABLE IF NOT EXISTS referrals (
      id VARCHAR(36) PRIMARY KEY,
      partner_id VARCHAR(36) NOT NULL,
      referral_code VARCHAR(255) NOT NULL,
      visitor_ip VARCHAR(100) NULL,
      device_fingerprint VARCHAR(255) NULL,
      landing_page TEXT NULL,
      utm_source VARCHAR(100) NULL,
      utm_medium VARCHAR(100) NULL,
      utm_campaign VARCHAR(100) NULL,
      cookie_id VARCHAR(255) NULL UNIQUE,
      converted TINYINT(1) NOT NULL DEFAULT 0,
      order_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_visit DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS commissions (
      id VARCHAR(36) PRIMARY KEY,
      partner_id VARCHAR(36) NOT NULL,
      order_id VARCHAR(36) NOT NULL,
      customer_id VARCHAR(36) NULL,
      service_name VARCHAR(255) NOT NULL,
      order_amount DECIMAL(10,2) NOT NULL,
      profit_amount DECIMAL(10,2) NOT NULL,
      commission_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      approved_at DATETIME NULL,
      paid_at DATETIME NULL,
      payout_id VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      commission_type VARCHAR(50) NOT NULL DEFAULT 'standard',
      cost_amount DECIMAL(10,2) NULL DEFAULT 0.00
    )`
  ];

  for (const q of queries) {
    console.log("Executing table creation...");
    try {
      await prisma.$executeRawUnsafe(q);
      console.log(" -> SUCCESS");
    } catch (err) {
      console.log(` -> FAILED: ${err.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
