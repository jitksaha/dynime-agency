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
    ]);
    
    $stmt = $pdo->query("SELECT * FROM public.site_settings");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Searching site_settings for keywords:\n";
    $keywords = ['zoho', 'crm', 'smtp', 'mail', 'google', 'backup', 'pass', 'key', 'token', 'client', 'secret', 'email'];
    
    foreach ($rows as $row) {
        $key = $row['key'];
        $val = $row['value'];
        $grp = $row['group'] ?? '';
        $lbl = $row['label'] ?? '';
        
        $match = false;
        foreach ($keywords as $kw) {
            if (stripos($key, $kw) !== false || stripos($grp, $kw) !== false || stripos($lbl, $kw) !== false) {
                $match = true;
                break;
            }
        }
        
        if ($match) {
            echo "Key: $key\n";
            echo "Group: $grp\n";
            echo "Label: $lbl\n";
            echo "Value: $val\n";
            echo "---------------------------------------------------\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
