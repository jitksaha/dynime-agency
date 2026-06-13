<?php
$host = 'aws-1-ap-southeast-2.pooler.supabase.com';
$port = 5432;
$db = 'postgres';
$user = 'postgres.isweduliawwjqwhyvwhp';
$pass = 'Pixel#@!194JkS';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 15
    ]);
    echo "Connected successfully to Supabase.\n\n";
    
    // 1. Check usa_state_pricing
    echo "=== USA STATE PRICING ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM public.usa_state_pricing");
    echo "Row count in Supabase: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT * FROM public.usa_state_pricing LIMIT 2");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
    echo "\n";
    
    // 2. Check country_eligibility
    echo "=== COUNTRY ELIGIBILITY ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM public.country_eligibility");
    echo "Row count in Supabase: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT * FROM public.country_eligibility LIMIT 2");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
    echo "\n";
    
    // 3. Check Orders since June 1, 2026
    echo "=== ORDERS SINCE JUNE 1, 2026 ===\n";
    // Let's check when orders were last created
    $stmt = $pdo->query("SELECT COUNT(*) FROM public.orders WHERE created_at >= '2026-06-01 00:00:00'");
    echo "Orders on/after June 1, 2026 count: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT MAX(created_at) FROM public.orders");
    echo "Latest order timestamp in Supabase: " . $stmt->fetchColumn() . "\n";
    $stmt = $pdo->query("SELECT id, customer_email, total, status, created_at FROM public.orders WHERE created_at >= '2026-06-01 00:00:00' ORDER BY created_at DESC LIMIT 5");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);
    echo "\n";
    
    // 4. Check Site Settings (including CRM and Email credentials)
    echo "=== SITE SETTINGS / INTEGRATION CREDENTIALS ===\n";
    $stmt = $pdo->query("SELECT * FROM public.site_settings");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $key = $row['key'];
        $val = $row['value'];
        $grp = $row['group'] ?? 'N/A';
        $lbl = $row['label'] ?? 'N/A';
        $pub = $row['is_public'] ?? 'N/A';
        
        // Check if Zoho, CRM, email, SMTP, or backup is in the key or group or value
        $isCrit = false;
        if (stripos($key, 'zoho') !== false || stripos($key, 'crm') !== false || 
            stripos($key, 'email') !== false || stripos($key, 'smtp') !== false || 
            stripos($key, 'backup') !== false || stripos($key, 'credentials') !== false ||
            stripos($grp, 'integration') !== false || stripos($grp, 'email') !== false || 
            stripos($grp, 'backup') !== false || stripos($grp, 'crm') !== false) {
            $isCrit = true;
        }
        
        if ($isCrit) {
            echo "Key: $key | Group: $grp | Label: $lbl | IsPublic: $pub\n";
            if (strlen($val) > 150) $val = substr($val, 0, 150) . '...';
            echo "  Value: $val\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
