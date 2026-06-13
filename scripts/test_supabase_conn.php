<?php
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
        PDO::ATTR_TIMEOUT => 10
    ]);
    echo "Connected successfully to Supabase!\n";
    
    // Check tables
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Found " . count($tables) . " tables in public schema.\n";
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
