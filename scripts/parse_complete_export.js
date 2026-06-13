import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../dynime-api/database/seeders/supabase_complete_export.json');
if (!fs.existsSync(jsonPath)) {
    console.log("File not found!");
    process.exit(1);
}

console.log("Loading JSON...");
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (data.site_settings) {
    console.log("Found site_settings table in JSON. Row count:", data.site_settings.rows ? data.site_settings.rows.length : 0);
    const rows = data.site_settings.rows || [];
    rows.forEach(r => {
        console.log(`Key: ${r.key} | Group: ${r.group} | Label: ${r.label}`);
        console.log(`  Value: ${JSON.stringify(r.value).substring(0, 150)}`);
        console.log("------------------");
    });
} else {
    console.log("site_settings table NOT found in complete export JSON!");
}
