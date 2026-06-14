<?php
header('Content-Type: text/plain; charset=utf-8');
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=u740731947_dynime;charset=utf8mb4", "u740731947_dynime", "Pixel#@!194JkS", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    $table = $_GET['table'] ?? 'site_settings';
    if (isset($_GET['dump'])) {
        echo "=== Dumping Data from: $table ===\n";
        $stmt = $pdo->query("SELECT * FROM `$table` LIMIT 100");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            print_r($row);
        }
    } else {
        echo "=== Describing Table: $table ===\n";
        $stmt = $pdo->query("DESCRIBE `$table`");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            print_r($row);
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
