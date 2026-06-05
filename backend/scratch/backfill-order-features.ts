import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function backfill() {
  const prisma = new PrismaClient();
  const dryRun = process.env.APPLY_CHANGES !== 'true';

  try {
    console.log(`=== Running Features Backfill (Dry Run: ${dryRun}) ===\n`);

    // 1. Fetch all service pricing rows to build a features cache
    const pricings = await pricingsCache(prisma);
    console.log(`Loaded ${pricings.size} services from service_pricing database table.\n`);

    // 2. Fetch all orders
    const orders = await prisma.orders.findMany({
      orderBy: { created_at: 'desc' },
    });

    let matchedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const brief = (order.service_brief as Record<string, any>) || {};
      const currentIncluded = Array.isArray(brief.included_services) ? brief.included_services : [];

      // If it already has populated services, skip it unless it's empty
      if (currentIncluded.length > 0) {
        skippedCount++;
        continue;
      }

      // Parse items
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];
      if (items.length === 0) {
        skippedCount++;
        continue;
      }

      // Try to find features from the items
      let foundFeatures: string[] = [];
      let matchedItemName = '';

      for (const item of items) {
        const itemId = String(item.id || '');
        const itemName = String(item.name || '');

        // Search in pricings cache
        for (const [slug, service] of pricings.entries()) {
          // Check if item id starts with slug or contains slug
          if (itemId.startsWith(slug) || itemId.includes(slug)) {
            // Find tier
            const tier = service.tiers.find(
              (t: any) => t.id && (itemId.endsWith(t.id) || itemId.includes(t.id))
            );
            if (tier && Array.isArray(tier.features) && tier.features.length > 0) {
              foundFeatures = tier.features;
              matchedItemName = itemName;
              break;
            }
          }
        }
        if (foundFeatures.length > 0) break;
      }

      // If we couldn't match a specific tier, try fallback matching by name/slug
      if (foundFeatures.length === 0) {
        for (const item of items) {
          const itemId = String(item.id || '');
          const itemName = String(item.name || '');

          for (const [slug, service] of pricings.entries()) {
            if (itemId.includes(slug) || itemName.toLowerCase().includes(service.title.toLowerCase())) {
              // Get features from the first tier that has features
              const firstTierWithFeatures = service.tiers.find(
                (t: any) => Array.isArray(t.features) && t.features.length > 0
              );
              if (firstTierWithFeatures) {
                foundFeatures = firstTierWithFeatures.features;
                matchedItemName = itemName;
                break;
              }
            }
          }
          if (foundFeatures.length > 0) break;
        }
      }

      // If found, update the order
      if (foundFeatures.length > 0) {
        matchedCount++;
        console.log(`Order ${order.invoice_number || order.id} (${order.customer_email})`);
        console.log(`  - Matched Item: "${matchedItemName}"`);
        console.log(`  - Features count: ${foundFeatures.length}`);
        console.log(`  - Features preview:`, foundFeatures.slice(0, 3).join(', ') + (foundFeatures.length > 3 ? '...' : ''));

        if (!dryRun) {
          const updatedBrief = {
            ...brief,
            included_services: foundFeatures,
          };
          await prisma.orders.update({
            where: { id: order.id },
            data: {
              service_brief: updatedBrief as any,
            },
          });
          console.log(`  -> SUCCESS: Order service_brief updated.`);
        }
        console.log();
      } else {
        // No features found (e.g. manual invoice, custom, or unmatched)
        skippedCount++;
      }
    }

    console.log(`\n=== Backfill Run Summary ===`);
    console.log(`Total Orders Processed: ${orders.length}`);
    console.log(`Matched & Updated: ${matchedCount}`);
    console.log(`Skipped / Already Populated / Unmatched: ${skippedCount}`);
    if (dryRun && matchedCount > 0) {
      console.log(`\nTo apply these changes permanently, run:`);
      console.log(`APPLY_CHANGES=true npx ts-node scratch/backfill-order-features.ts`);
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

async function pricingsCache(prisma: PrismaClient): Promise<Map<string, { title: string; tiers: any[] }>> {
  const cache = new Map<string, { title: string; tiers: any[] }>();
  const rows = await prisma.service_pricing.findMany();
  for (const row of rows) {
    const tiers = Array.isArray(row.tiers) ? (row.tiers as any[]) : [];
    cache.set(row.service_slug, {
      title: row.service_title || '',
      tiers,
    });
  }
  return cache;
}

backfill();
