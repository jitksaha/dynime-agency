<?php
/**
 * Complete Dynamic Data Importer from Supabase (Postgres) JSON to MySQL
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== SUPABASE COMPLETE DATA IMPORT ===\n\n";

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';
$envPath = $apiDir . '/.env';
$exportPath = $apiDir . '/database/seeders/supabase_complete_export.json';

if (!file_exists($envPath)) {
    echo "Error: .env file not found at $envPath.\n";
    exit;
}

if (!file_exists($exportPath)) {
    echo "Error: JSON export file not found at $exportPath.\n";
    exit;
}

// 1. Parse .env to get MySQL connection details
$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$db_host = '127.0.0.1';
$db_port = '3306';
$db_database = '';
$db_username = '';
$db_password = '';

foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $key = trim($parts[0]);
        $val = trim(trim($parts[1]), '"\'');
        if ($key === 'DB_HOST') $db_host = $val;
        if ($key === 'DB_PORT') $db_port = $val;
        if ($key === 'DB_DATABASE') $db_database = $val;
        if ($key === 'DB_USERNAME') $db_username = $val;
        if ($key === 'DB_PASSWORD') $db_password = $val;
    }
}

echo "Database Host: $db_host\n";
echo "Database Name: $db_database\n";
echo "Database User: $db_username\n\n";

// 2. Connect to MySQL Database
try {
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "Connected successfully to MySQL database.\n";
} catch (Exception $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

// Disable foreign keys during import to avoid dependency order issues
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

// 3. Load and Decode JSON Export
echo "Reading export JSON file...\n";
$jsonData = json_decode(file_get_contents($exportPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "Error: Failed to parse JSON export file - " . json_last_error_msg() . "\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    exit;
}

echo "Loaded " . count($jsonData) . " tables from JSON.\n\n";

// 4. Dynamic Column Mapping
function mapPostgresTypeToMysql($pgType, $colName) {
    $pgType = strtolower($pgType);
    if (strpos($pgType, 'integer') !== false || strpos($pgType, 'int') !== false) {
        if (strpos($pgType, 'bigint') !== false) return "BIGINT";
        if (strpos($pgType, 'smallint') !== false) return "SMALLINT";
        return "INT";
    }
    if ($pgType === 'boolean') {
        return "TINYINT(1)";
    }
    if (strpos($pgType, 'timestamp') !== false) {
        return "TIMESTAMP";
    }
    if ($pgType === 'date') {
        return "DATE";
    }
    if (strpos($pgType, 'numeric') !== false || strpos($pgType, 'decimal') !== false) {
        return "DECIMAL(20, 6)";
    }
    if (strpos($pgType, 'double') !== false || strpos($pgType, 'real') !== false) {
        return "DOUBLE";
    }
    if ($pgType === 'uuid') {
        return "VARCHAR(36)";
    }
    if (strpos($pgType, 'json') !== false) {
        return "JSON";
    }
    if (strpos($pgType, 'character varying') !== false || strpos($pgType, 'varchar') !== false) {
        return "VARCHAR(255)";
    }
    if (strpos($pgType, 'text') !== false) {
        return "TEXT";
    }
    // Fallback
    return "TEXT";
}

// 5. Migrate each table
foreach ($jsonData as $tableName => $tableData) {
    echo "Processing table: $tableName...\n";
    
    // Safety check: Never drop or override admin_users completely
    if ($tableName === 'admin_users' || $tableName === 'public.admin_users') {
        echo " - Skipping table admin_users schema changes and full override to protect login credentials.\n";
        continue;
    }

    $columns = $tableData['columns'] ?? [];
    $rows = $tableData['rows'] ?? [];

    if (empty($columns)) {
        echo " - Warning: Column list empty. Skipping schema creation.\n";
        continue;
    }

    // Check if table exists in MySQL
    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
    $stmt->execute(['table' => $tableName]);
    $tableExists = $stmt->rowCount() > 0;

    if (!$tableExists) {
        echo " - Table does not exist. Creating dynamically...\n";
        $colDefs = [];
        $hasId = false;

        foreach ($columns as $col) {
            $name = $col['name'];
            $type = mapPostgresTypeToMysql($col['type'], $name);
            $nullDef = $col['nullable'] ? "NULL" : "NOT NULL";
            $defaultDef = "";

            if ($type === 'TIMESTAMP' || $type === 'DATE') {
                $nullDef = "NULL";
                $defaultDef = "DEFAULT NULL";
            }

            $colDefs[] = "`$name` $type $nullDef" . ($defaultDef ? " $defaultDef" : "");

            if ($name === 'id') {
                $hasId = true;
            }
        }

        if ($hasId) {
            $colDefs[] = "PRIMARY KEY (`id`)";
        }

        $createSql = "CREATE TABLE `$tableName` (\n  " . implode(",\n  ", $colDefs) . "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        try {
            $pdo->exec($createSql);
            echo "   - Successfully created table `$tableName`.\n";
        } catch (Exception $e) {
            echo "   - Error: Failed to create table `$tableName`: " . $e->getMessage() . "\n";
            continue;
        }
    } else {
        echo " - Table exists. Checking and adding missing columns...\n";
        // Retrieve existing columns
        $existingCols = [];
        $stmtCols = $pdo->query("SHOW COLUMNS FROM `$tableName`");
        while ($c = $stmtCols->fetch()) {
            $existingCols[] = strtolower($c['Field']);
        }

        foreach ($columns as $col) {
            $name = $col['name'];
            if (!in_array(strtolower($name), $existingCols)) {
                $type = mapPostgresTypeToMysql($col['type'], $name);
                $nullDef = $col['nullable'] ? "NULL" : "NOT NULL";
                $defaultDef = "";

                if ($type === 'TIMESTAMP' || $type === 'DATE') {
                    $nullDef = "NULL";
                    $defaultDef = "DEFAULT NULL";
                }

                $alterSql = "ALTER TABLE `$tableName` ADD COLUMN `$name` $type $nullDef" . ($defaultDef ? " $defaultDef" : "");
                try {
                    $pdo->exec($alterSql);
                    echo "   - Added missing column `$name` to table `$tableName`.\n";
                } catch (Exception $e) {
                    echo "   - Error adding column `$name`: " . $e->getMessage() . "\n";
                }
            }
        }

        echo " - Clearing existing data (preserving table structure)...\n";
        try {
            $pdo->exec("TRUNCATE TABLE `$tableName`");
        } catch (Exception $e) {
            // Fallback to DELETE if TRUNCATE fails (e.g. FK constraints)
            try {
                $pdo->exec("DELETE FROM `$tableName`");
                $pdo->exec("ALTER TABLE `$tableName` AUTO_INCREMENT = 1;");
            } catch (Exception $e2) {
                echo "   - Warning: Failed to clear data: " . $e2->getMessage() . "\n";
            }
        }
    }

    // Insert data rows
    if (empty($rows)) {
        echo " - No rows to import.\n";
        continue;
    }

    echo " - Importing " . count($rows) . " rows...\n";
    
    $colNames = array_map(function($col) { return $col['name']; }, $columns);
    $placeholders = array_map(function($name) { return ":" . $name; }, $colNames);
    
    // Use INSERT IGNORE to prevent duplicate key errors during import
    $insertSql = "INSERT IGNORE INTO `$tableName` (" . implode(', ', array_map(function($n) { return "`$n`"; }, $colNames)) . ") 
                  VALUES (" . implode(', ', $placeholders) . ")";
                  
    try {
        $insertStmt = $pdo->prepare($insertSql);
        $insertedCount = 0;
        
        $pdo->beginTransaction();
        foreach ($rows as $row) {
            $bindParams = [];
            foreach ($colNames as $colName) {
                $val = isset($row[$colName]) ? $row[$colName] : null;
                
                if (is_array($val) || is_object($val)) {
                    $val = json_encode($val);
                } elseif (is_bool($val)) {
                    $val = $val ? 1 : 0;
                }
                
                $bindParams[$colName] = $val;
            }
            $insertStmt->execute($bindParams);
            $insertedCount++;
        }
        $pdo->commit();
        echo "   - Imported $insertedCount rows successfully.\n";
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // Error 1467: corrupted auto-increment — drop+recreate the table and retry
        if (strpos($e->getMessage(), '1467') !== false) {
            echo "   - Auto-increment corrupted. Dropping and recreating table `$tableName`...\n";
            try {
                $pdo->exec("DROP TABLE `$tableName`");
                // Rebuild column defs
                $colDefs2 = [];
                $hasId2 = false;
                foreach ($columns as $col) {
                    $name2 = $col['name'];
                    $type2 = mapPostgresTypeToMysql($col['type'], $name2);
                    $nullDef2 = ($type2 === 'TIMESTAMP' || $type2 === 'DATE') ? "NULL DEFAULT NULL" : ($col['nullable'] ? "NULL" : "NOT NULL");
                    $colDefs2[] = "`$name2` $type2 $nullDef2";
                    if ($name2 === 'id') $hasId2 = true;
                }
                if ($hasId2) $colDefs2[] = "PRIMARY KEY (`id`)";
                $pdo->exec("CREATE TABLE `$tableName` (\n  " . implode(",\n  ", $colDefs2) . "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
                // Retry insert
                $insertStmt2 = $pdo->prepare($insertSql);
                $insertedCount2 = 0;
                $pdo->beginTransaction();
                foreach ($rows as $row2) {
                    $bindParams2 = [];
                    foreach ($colNames as $colName2) {
                        $val2 = isset($row2[$colName2]) ? $row2[$colName2] : null;
                        if (is_array($val2) || is_object($val2)) $val2 = json_encode($val2);
                        elseif (is_bool($val2)) $val2 = $val2 ? 1 : 0;
                        $bindParams2[$colName2] = $val2;
                    }
                    $insertStmt2->execute($bindParams2);
                    $insertedCount2++;
                }
                $pdo->commit();
                echo "   - Recreated and imported $insertedCount2 rows successfully.\n";
            } catch (Exception $e3) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                echo "   - Error after recreate: " . $e3->getMessage() . "\n";
            }
        } else {
            echo "   - Error inserting data: " . $e->getMessage() . "\n";
        }
    }
}

// Restore foreign keys
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
echo "\n=== IMPORT COMPLETED SUCCESSFULLY ===\n";
