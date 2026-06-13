const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'dynime_prod'
  });

  const [rows] = await connection.execute('SELECT value FROM site_settings WHERE `key` = "home_sections"');
  if (rows.length === 0) {
    console.log("No home_sections key found");
    await connection.end();
    return;
  }

  let val = rows[0].value;
  if (typeof val === 'string') {
    val = JSON.parse(val);
  }

  const items = val?.team?.items || [];
  console.log(`Found ${items.length} team items:`);
  items.forEach((item, idx) => {
    if (item.name && item.name.includes("Jit")) {
      console.log(`[${idx}]`, JSON.stringify(item, null, 2));
    }
  });

  await connection.end();
}

main().catch(console.error);
