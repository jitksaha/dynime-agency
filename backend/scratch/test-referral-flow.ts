import { PrismaClient } from '@prisma/client';
import { ReferralService } from '../src/referral/referral.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  const prisma = new PrismaClient();
  const eventServiceMock = { emit: () => {} } as any;
  const referralService = new ReferralService(prisma as any, eventServiceMock);

  console.log('--- STARTING REFERRAL SYSTEM INTEGRATION TEST (INCLUDING OVERRIDES) ---');

  // Generate unique IDs/emails to avoid clashes
  const testId = Math.random().toString(36).substring(2, 9);
  
  // Parent Partner Details
  const parentEmail = `parent_${testId}@example.com`;
  const parentName = `Parent ${testId}`;
  const parentUserId = `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Child Partner Details
  const childEmail = `child_${testId}@example.com`;
  const childName = `Child ${testId}`;
  const childUserId = `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  // Customer Details
  const customerEmail = `customer_${testId}@example.com`;
  const customerName = `Customer ${testId}`;
  
  // Order Details
  const orderId1 = `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const orderId2 = `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const selfOrderId = `00000000-0000-0000-0000-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

  let registeredParent: any = null;
  let registeredChild: any = null;

  try {
    // 1. Register Parent Partner
    console.log(`1. Registering parent partner: ${parentEmail}`);
    const parent = await referralService.registerPartner(parentUserId, parentEmail, parentName);
    registeredParent = parent;
    console.log(`   Parent registered with code: ${parent.referral_code}`);

    // 2. Register Child Partner referred by Parent Partner
    console.log(`2. Registering child partner referred by parent code: ${parent.referral_code}`);
    const child = await referralService.registerPartner(childUserId, childEmail, childName, parent.referral_code);
    registeredChild = child;
    console.log(`   Child registered with code: ${child.referral_code}, parent link: ${child.parent_partner_id}`);

    if (child.parent_partner_id !== parent.id) {
      throw new Error(`Referred child parent link mismatch: expected ${parent.id}, got ${child.parent_partner_id}`);
    }
    console.log('   ✔ Child linked to parent partner successfully.');

    // 3. Track Click via Child Partner referral code
    console.log('3. Tracking click via child referral link...');
    const trackRes = await referralService.trackClick({
      referralCode: child.referral_code,
      visitorIp: '192.168.1.51',
      deviceFingerprint: 'df-56789',
      landingPage: 'https://dynime.com/services/web-development?ref=' + child.referral_code,
      utmSource: 'linkedin',
      cookieId: `cookie_${testId}`,
    });
    console.log('   Track result:', trackRes);

    // Verify click record created
    const referrals = await prisma.referrals.findMany({
      where: { partner_id: child.id },
    });
    if (referrals.length === 1) {
      console.log('   ✔ Click successfully tracked.');
    } else {
      throw new Error('Click not tracked');
    }

    // 4. Create customer order in the database
    console.log('4. Creating test order worth $450...');
    await prisma.orders.create({
      data: {
        id: orderId1,
        customer_email: customerEmail,
        customer_name: customerName,
        total: 450,
        subtotal: 450,
        status: 'paid',
        items: [{ name: 'Web Development', price: 450 }],
        referral_code: child.referral_code,
      },
    });

    // 5. Trigger commission (First Purchase)
    console.log('5. Triggering commission for first purchase...');
    await referralService.triggerCommission(orderId1, customerEmail, child.referral_code, 450);

    // Verify standard child commission
    const childCommissions = await prisma.commissions.findMany({
      where: { partner_id: child.id },
    });
    console.log(`   Child Commissions count: ${childCommissions.length}`);
    if (childCommissions.length === 1) {
      const comm = childCommissions[0];
      console.log(`   ✔ Child Standard commission created: $${comm.commission_amount} (Type: ${comm.commission_type})`);
      if (Number(comm.commission_amount) !== 5) {
        throw new Error(`Expected $5 standard commission, got ${comm.commission_amount}`);
      }
      if (comm.commission_type !== 'standard') {
        throw new Error(`Expected standard commission_type, got ${comm.commission_type}`);
      }
    } else {
      throw new Error('Child commission not generated');
    }

    // Verify parent override commission
    const parentCommissions = await prisma.commissions.findMany({
      where: { partner_id: parent.id },
    });
    console.log(`   Parent Commissions count: ${parentCommissions.length}`);
    if (parentCommissions.length === 1) {
      const comm = parentCommissions[0];
      console.log(`   ✔ Parent Override commission created: $${comm.commission_amount} (Type: ${comm.commission_type})`);
      // Override is $5 standard commission * 10% share = $0.50
      if (Number(comm.commission_amount) !== 0.50) {
        throw new Error(`Expected $0.50 override commission, got ${comm.commission_amount}`);
      }
      if (comm.commission_type !== 'override') {
        throw new Error(`Expected override commission_type, got ${comm.commission_type}`);
      }
    } else {
      throw new Error('Parent override commission not generated');
    }

    // Check stats for both partners
    console.log('6. Verifying both partners stats accumulators...');
    const childStats = await referralService.getPartnerStats(childUserId);
    const parentStats = await referralService.getPartnerStats(parentUserId);
    console.log('   Child Total Earned:', childStats.summary.totalEarned);
    console.log('   Parent Total Earned:', parentStats.summary.totalEarned);

    if (childStats.summary.totalEarned === 5 && parentStats.summary.totalEarned === 0.50) {
      console.log('   ✔ Stats accumulators correct.');
    } else {
      throw new Error('Stats accumulators mismatch');
    }

    // 7. Clean up all records
    console.log('7. Cleaning up test records...');
    await prisma.commissions.deleteMany({ where: { partner_id: { in: [child.id, parent.id] } } });
    await prisma.payouts.deleteMany({ where: { partner_id: { in: [child.id, parent.id] } } });
    await prisma.referrals.deleteMany({ where: { partner_id: { in: [child.id, parent.id] } } });
    await prisma.orders.deleteMany({ where: { id: { in: [orderId1, orderId2, selfOrderId] } } });
    await prisma.partners.deleteMany({ where: { id: { in: [child.id, parent.id] } } });
    await prisma.user_roles.deleteMany({ where: { user_id: { in: [childUserId, parentUserId] } } });
    console.log('   ✔ Cleanup finished.');

    console.log('\n======================================================');
    console.log('🏆 SUCCESS! Multi-level Referral Commission overrides checked out successfully!');
    console.log('======================================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    // Cleanup
    try {
      if (registeredChild || registeredParent) {
        const ids: string[] = [];
        if (registeredChild) ids.push(registeredChild.id);
        if (registeredParent) ids.push(registeredParent.id);
        
        await prisma.commissions.deleteMany({ where: { partner_id: { in: ids } } }).catch(() => {});
        await prisma.payouts.deleteMany({ where: { partner_id: { in: ids } } }).catch(() => {});
        await prisma.referrals.deleteMany({ where: { partner_id: { in: ids } } }).catch(() => {});
        await prisma.orders.deleteMany({ where: { id: { in: [orderId1, orderId2, selfOrderId] } } }).catch(() => {});
        await prisma.partners.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
        await prisma.user_roles.deleteMany({ where: { user_id: { in: [childUserId, parentUserId] } } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.error('Cleanup failed:', cleanupErr);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
