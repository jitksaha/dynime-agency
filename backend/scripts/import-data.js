const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const exportPath = path.join(__dirname, '../../dynime-api/database/seeders/supabase_complete_export.json');
  if (!fs.existsSync(exportPath)) {
    console.error(`Export file not found at: ${exportPath}`);
    process.exit(1);
  }

  console.log("Reading supabase_complete_export.json...");
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const tableNames = Object.keys(exportData);
  console.log(`Found ${tableNames.length} tables in export file.`);

  // Temporarily disable foreign key checks in MySQL
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  for (const tableName of tableNames) {
    // Check if the table exists in MySQL and get its columns
    let validColumns = [];
    let columnTypes = {};
    try {
      const cols = await prisma.$queryRawUnsafe(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        tableName
      );
      validColumns = cols.map(c => c.COLUMN_NAME);
      cols.forEach(c => {
        columnTypes[c.COLUMN_NAME] = c.DATA_TYPE.toLowerCase();
      });
      if (validColumns.length === 0) {
        console.log(`Table ${tableName} does not exist in MySQL. Skipping.`);
        continue;
      }
    } catch (err) {
      console.log(`Failed to query columns for ${tableName}: ${err.message}. Skipping.`);
      continue;
    }

    const tableRows = exportData[tableName].rows || [];
    console.log(`Processing table: ${tableName} (${tableRows.length} rows)`);

    // Safety: Skip admin_users to protect local login credentials
    if (tableName === 'admin_users') {
      console.log(` - Skipping admin_users to protect local credentials.`);
      continue;
    }

    // Clean existing data
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tableName}\``);
    } catch (err) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM \`${tableName}\``);
      } catch (err2) {
        console.log(` - Warning: Failed to truncate/clear table ${tableName}: ${err2.message}`);
      }
    }

    if (tableRows.length === 0) {
      continue;
    }

    // Insert rows in chunks
    const chunkSize = 100;
    for (let i = 0; i < tableRows.length; i += chunkSize) {
      const chunk = tableRows.slice(i, i + chunkSize);
      for (const row of chunk) {
        const cleanRow = {};
        for (const colName of validColumns) {
          if (row.hasOwnProperty(colName)) {
            let val = row[colName];

            // If the column in MySQL is numeric but the input value is a UUID/non-numeric string,
            // skip importing this column (specifically for 'id' to let it auto-increment)
            const type = columnTypes[colName];
            const isNumericType = ['bigint', 'int', 'mediumint', 'smallint', 'tinyint'].includes(type);
            if (isNumericType && typeof val === 'string' && isNaN(Number(val))) {
              if (colName === 'id') {
                continue; // let MySQL auto-increment it
              } else {
                val = 0; // fallback for other numeric fields
              }
            }

            if (val !== null && typeof val === 'object') {
              val = JSON.stringify(val);
            } else if (typeof val === 'boolean') {
              val = val ? 1 : 0;
            }
            cleanRow[colName] = val;
          }
        }

        // Insert row using executeRawUnsafe
        const colList = Object.keys(cleanRow).map(c => `\`${c}\``).join(', ');
        const valPlaceholders = Object.keys(cleanRow).map(() => '?').join(', ');
        const values = Object.values(cleanRow);

        try {
          await prisma.$executeRawUnsafe(
            `INSERT IGNORE INTO \`${tableName}\` (${colList}) VALUES (${valPlaceholders})`,
            ...values
          );
        } catch (err) {
          console.error(` - Error inserting into ${tableName}: ${err.message}`, cleanRow);
        }
      }
    }
    console.log(` - Successfully imported rows for ${tableName}`);
  }

  // Restore foreign key checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log("=== IMPORT COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
