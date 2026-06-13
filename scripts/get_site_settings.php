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
    
    $stmt = $pdo->query("SELECT * FROM public.site_settings");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total site_settings rows in Supabase: " . count($rows) . "\n\n";
    foreach ($rows as $row) {
        $key = $row['key'];
        $val = $row['value'];
        $grp = $row['group'] ?? 'N/A';
        $lbl = $row['label'] ?? 'N/A';
        
        echo "Key: $key\n";
        echo "Group: $grp\n";
        echo "Label: $lbl\n";
        echo "Value: $val\n";
        echo "---------------------------------------------------\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
