<?php
header('Content-Type: text/plain; charset=utf-8');

$host = 'aws-1-ap-southeast-2.pooler.supabase.com';
$port = 5432;
$db = 'postgres';
$user = 'postgres.isweduliawwjqwhyvwhp';
$pass = 'Pixel#@!194JkS';

try {
    echo "Connecting to Supabase PostgreSQL...\n";
    $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 30
    ]);
    echo "Connected successfully to Supabase.\n\n";
    
    // 1. List all tables in public schema
    echo "--- List of all public tables on Supabase ---\n";
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        echo " - $t\n";
    }
    echo "\n";
    
    // 2. Search for tables matching keyword "state", "pricing", "country", "eligibility", "zoho", "integration"
    echo "--- Target Tables Check ---\n";
    $targets = ['usa_state_pricing', 'country_eligibility', 'site_settings', 'orders', 'services'];
    foreach ($targets as $tbl) {
        if (in_array($tbl, $tables)) {
            $count = $pdo->query("SELECT COUNT(*) FROM public.$tbl")->fetchColumn();
            echo "Table '$tbl' exists, row count: $count\n";
            // Print schema/columns
            $colStmt = $pdo->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=:tbl");
            $colStmt->execute(['tbl' => $tbl]);
            $cols = $colStmt->fetchAll();
            echo "Columns: ";
            foreach ($cols as $c) {
                echo "{$c['column_name']} ({$c['data_type']}), ";
            }
            echo "\n\n";
        } else {
            echo "Table '$tbl' does not exist!\n\n";
        }
    }

    // 3. Check for specific integration columns or rows in site_settings
    if (in_array('site_settings', $tables)) {
        echo "--- site_settings data ---\n";
        $stmt = $pdo->query("SELECT * FROM public.site_settings");
        $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($settings as $s) {
            $grp = isset($s['group']) ? $s['group'] : 'N/A';
            $lbl = isset($s['label']) ? $s['label'] : 'N/A';
            $pub = isset($s['is_public']) ? $s['is_public'] : 'N/A';
            echo "Key: {$s['key']} | Group: $grp | Label: $lbl | IsPublic: $pub\n";
            // Truncate value for readability if too long
            $val = $s['value'];
            if (strlen($val) > 150) $val = substr($val, 0, 150) . '...';
            echo "  Value: $val\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
