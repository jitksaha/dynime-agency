<?php
/**
 * Database sync mismatch and credential seeder utility
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== DATABASE SYNC & CREDENTIAL SEEDER ===\n\n";

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';
$envPath = $apiDir . '/.env';

if (!file_exists($envPath)) {
    echo "Error: .env file not found at $envPath.\n";
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
    echo "Connected successfully to MySQL database.\n\n";
} catch (Exception $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

// Disable foreign keys during sync
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

// 3. Sync pricing tables
try {
    echo "Syncing usa_state_pricing -> usa_state_pricings...\n";
    // Check if both tables exist
    $hasSource = $pdo->query("SHOW TABLES LIKE 'usa_state_pricing'")->rowCount() > 0;
    $hasDest = $pdo->query("SHOW TABLES LIKE 'usa_state_pricings'")->rowCount() > 0;

    if ($hasSource && $hasDest) {
        $pdo->exec("TRUNCATE TABLE `usa_state_pricings`");
        $pdo->exec("INSERT INTO `usa_state_pricings` (
            id, state, abbr, llc_formation, corp_formation, llc_annual, llc_annual_label, 
            corp_annual, corp_annual_label, llc_renewal, corp_renewal, state_tax_note, 
            franchise_tax, notes, sort_order, is_active, created_at, updated_at
        ) SELECT 
            id, state, abbr, llc_formation, corp_formation, llc_annual, llc_annual_label, 
            corp_annual, corp_annual_label, llc_renewal, corp_renewal, state_tax_note, 
            franchise_tax, notes, sort_order, is_active, created_at, updated_at 
        FROM `usa_state_pricing`");
        $count = $pdo->query("SELECT COUNT(*) FROM `usa_state_pricings`")->fetchColumn();
        echo "Successfully synced $count states to usa_state_pricings.\n";
    } else {
        echo "Warning: Tables usa_state_pricing (source: " . ($hasSource ? 'yes' : 'no') . ") or usa_state_pricings (dest: " . ($hasDest ? 'yes' : 'no') . ") missing.\n";
    }
} catch (Exception $e) {
    echo "Error syncing usa_state_pricings: " . $e->getMessage() . "\n";
}

try {
    echo "\nSyncing service_pricing -> service_pricings...\n";
    $hasSource = $pdo->query("SHOW TABLES LIKE 'service_pricing'")->rowCount() > 0;
    $hasDest = $pdo->query("SHOW TABLES LIKE 'service_pricings'")->rowCount() > 0;

    if ($hasSource && $hasDest) {
        $pdo->exec("TRUNCATE TABLE `service_pricings`");
        $pdo->exec("INSERT INTO `service_pricings` (
            id, service_slug, service_title, is_enabled, tiers, quote_settings, created_at, updated_at
        ) SELECT 
            id, service_slug, service_title, is_enabled, tiers, quote_settings, created_at, updated_at 
        FROM `service_pricing`");
        $count = $pdo->query("SELECT COUNT(*) FROM `service_pricings`")->fetchColumn();
        echo "Successfully synced $count services to service_pricings.\n";
    } else {
        echo "Warning: Tables service_pricing (source: " . ($hasSource ? 'yes' : 'no') . ") or service_pricings (dest: " . ($hasDest ? 'yes' : 'no') . ") missing.\n";
    }
} catch (Exception $e) {
    echo "Error syncing service_pricings: " . $e->getMessage() . "\n";
}

// 4. Seed Settings in site_settings
echo "\nSeeding integration settings in site_settings...\n";

$settingsToSeed = [
    // Zoho CRM credentials
    [
        'key' => 'zoho_credentials',
        'value' => json_encode([
            'client_id' => '1000.RCLV4HOSRLYVRTY8JGEW2EGL0XDKJF',
            'client_secret' => '6bfdec28600c96fcfdd50aa3b5af99d92acff2610a',
            'refresh_token' => '1000.177f9fe634bd0faf735e8c88f9789d82.fc3a5b5dfeb0fe67982bbc36f361ec04',
            'accounts_domain' => 'https://accounts.zoho.com',
            'api_domain' => 'https://www.zohoapis.com'
        ]),
        'group' => 'zoho',
        'label' => 'Zoho CRM Credentials',
        'is_public' => 0
    ],
    // Google Backup Settings
    [
        'key' => 'google_backup_settings',
        'value' => json_encode([
            'clientId' => '',
            'clientSecret' => '',
            'connected' => false,
            'email' => '',
            'lastBackupStatus' => 'idle',
            'lastBackupTime' => null
        ]),
        'group' => 'backup',
        'label' => 'Google Backup Settings',
        'is_public' => 0
    ],
    // SMTP host
    [
        'key' => 'smtp_host',
        'value' => json_encode('smtp.hostinger.com'),
        'group' => 'mail',
        'label' => 'SMTP Host',
        'is_public' => 0
    ],
    // SMTP port
    [
        'key' => 'smtp_port',
        'value' => json_encode(465),
        'group' => 'mail',
        'label' => 'SMTP Port',
        'is_public' => 0
    ],
    // SMTP username
    [
        'key' => 'smtp_username',
        'value' => json_encode('notifications@dynime.com'),
        'group' => 'mail',
        'label' => 'SMTP Username',
        'is_public' => 0
    ],
    // SMTP password
    [
        'key' => 'smtp_password',
        'value' => json_encode('Pixel#@!194JkS'),
        'group' => 'mail',
        'label' => 'SMTP Password',
        'is_public' => 0
    ],
    // SMTP encryption
    [
        'key' => 'smtp_encryption',
        'value' => json_encode('ssl'),
        'group' => 'mail',
        'label' => 'SMTP Encryption',
        'is_public' => 0
    ],
    // SMTP from address
    [
        'key' => 'smtp_from_address',
        'value' => json_encode('notifications@dynime.com'),
        'group' => 'mail',
        'label' => 'SMTP From Address',
        'is_public' => 0
    ],
    // SMTP from name
    [
        'key' => 'smtp_from_name',
        'value' => json_encode('Dynime'),
        'group' => 'mail',
        'label' => 'SMTP From Name',
        'is_public' => 0
    ]
];

$upsertSql = "INSERT INTO site_settings (`key`, `value`, `group`, `label`, `is_public`, `created_at`, `updated_at`)
              VALUES (:key, :value, :group, :label, :is_public, NOW(), NOW())
              ON DUPLICATE KEY UPDATE
              `value` = VALUES(`value`),
              `group` = VALUES(`group`),
              `label` = VALUES(`label`),
              `is_public` = VALUES(`is_public`),
              `updated_at` = NOW()";

$stmt = $pdo->prepare($upsertSql);

foreach ($settingsToSeed as $setting) {
    try {
        $stmt->execute([
            'key' => $setting['key'],
            'value' => $setting['value'],
            'group' => $setting['group'],
            'label' => $setting['label'],
            'is_public' => $setting['is_public']
        ]);
        echo "Seed success for key: {$setting['key']}\n";
    } catch (Exception $e) {
        echo "Error seeding key {$setting['key']}: " . $e->getMessage() . "\n";
    }
}

// Restore foreign keys
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
echo "\n=== SYNC AND SEED COMPLETED ===\n";
