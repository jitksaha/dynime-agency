<?php

$envPath = '/Users/jitkumarsaha/Dynime Inc/dynime.com/dynime-api/.env';
$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $env[trim($parts[0])] = trim(trim($parts[1]), '"\'');
    }
}

$db_host = $env['DB_HOST'] ?? '127.0.0.1';
$db_port = $env['DB_PORT'] ?? '3306';
$db_database = $env['DB_DATABASE'] ?? 'dynime_prod';
$db_username = $env['DB_USERNAME'] ?? 'root';
$db_password = $env['DB_PASSWORD'] ?? '';

$dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
$pdo = new PDO($dsn, $db_username, $db_password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $table) {
    // get columns
    $colStmt = $pdo->query("SHOW COLUMNS FROM `$table`");
    $cols = $colStmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($cols as $col) {
        $colName = $col['Field'];
        $type = $col['Type'];
        
        // only search string or text or json columns
        if (preg_match('/char|text|varchar|json/i', $type)) {
            try {
                $searchStmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE `$colName` LIKE ?");
                $searchStmt->execute(['%DTLE001001%']);
                $count = $searchStmt->fetchColumn();
                if ($count > 0) {
                    echo "Found $count matches in table `$table`, column `$colName`!\n";
                    // select and print
                    $rowsStmt = $pdo->prepare("SELECT * FROM `$table` WHERE `$colName` LIKE ?");
                    $rowsStmt->execute(['%DTLE001001%']);
                    $rows = $rowsStmt->fetchAll(PDO::FETCH_ASSOC);
                    print_r($rows);
                }
            } catch (Exception $e) {
                // ignore errors
            }
        }
    }
}
echo "Search completed.\n";
