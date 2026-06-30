<?php
// PHP Script to sync 5 offices inside Hostinger production database
header('Content-Type: text/plain');

$token = $_GET['token'] ?? '';
if ($token !== 'deploy_token_7782') {
    die("Unauthorized access token.");
}

// 1. Parse .env file
$envPath = __DIR__ . '/../dynime-api/.env';
if (!file_exists($envPath)) {
    // Try parent directory
    $envPath = __DIR__ . '/dynime-api/.env';
}
if (!file_exists($envPath)) {
    die("Error: .env file not found.");
}

$env = [];
$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val, " \t\n\r\0\x0B\"'");
    }
}

$db_host = $env['DB_HOST'] ?? '127.0.0.1';
$db_port = $env['DB_PORT'] ?? '3306';
$db_database = $env['DB_DATABASE'] ?? '';
$db_username = $env['DB_USERNAME'] ?? '';
$db_password = $env['DB_PASSWORD'] ?? '';

if (empty($db_database)) {
    die("Error: DB_DATABASE not configured in .env");
}

try {
    echo "Connecting to MySQL database: $db_database...\n";
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // 2. Check if contact_info table exists
    $tableExists = $pdo->query("SHOW TABLES LIKE 'contact_info'")->rowCount() > 0;
    if (!$tableExists) {
        die("Error: contact_info table does not exist in this database.");
    }
    
    // 3. Delete old address rows
    echo "Deleting old addresses from contact_info table...\n";
    $stmt = $pdo->prepare("DELETE FROM contact_info WHERE type = 'address'");
    $stmt->execute();
    echo "Deleted " . $stmt->rowCount() . " rows.\n";
    
    // 4. Seed the 5 new addresses
    $newOffices = [
        [
            'id' => 'a20e03b5-d6fa-4ce8-85de-4976246e65e1',
            'label' => 'New York, USA (Headquarters)',
            'type' => 'address',
            'value' => json_encode([
                'address' => '244 5th Ave, Suite #1964, New York, NY 10001, USA',
                'flag' => '🇺🇸',
                'office_type' => 'Corporate Headquarters',
                'receives_documents' => false,
                'receives_parcels' => false,
                'visit_policy' => 'Appointment Only',
                'notice' => '',
                'is_primary' => true,
                'phone' => '+1 (646) 884-0271',
                'whatsapp' => '+1 (646) 884-0271',
                'whatsappPreFill' => "Hello Dynime,\n\nI would like to schedule an appointment at your New York office.\n\nThank you."
            ], JSON_UNESCAPED_UNICODE),
            'icon' => 'MapPin',
            'sort_order' => 1,
            'is_active' => 1
        ],
        [
            'id' => 'b2475e40-d145-4945-87f9-a0040b12e0e0',
            'label' => 'New Mexico, USA',
            'type' => 'address',
            'value' => json_encode([
                'address' => 'Address will be updated soon.',
                'flag' => '🇺🇸',
                'office_type' => 'Registered Business Address',
                'receives_documents' => true,
                'receives_parcels' => true,
                'visit_policy' => 'Appointment Only',
                'notice' => '',
                'is_primary' => false,
                'phone' => '+1 (646) 884-0271',
                'whatsapp' => '+1 (646) 884-0271',
                'whatsappPreFill' => ''
            ], JSON_UNESCAPED_UNICODE),
            'icon' => 'MapPin',
            'sort_order' => 2,
            'is_active' => 1
        ],
        [
            'id' => 'c2105e40-a145-4245-87f9-b0040b12e0e1',
            'label' => 'Florida, USA',
            'type' => 'address',
            'value' => json_encode([
                'address' => '4283 Express Lane, Suite BD1724, Sarasota, FL 34249, USA',
                'flag' => '🇺🇸',
                'office_type' => 'Mail & Parcel Receiving Center',
                'receives_documents' => true,
                'receives_parcels' => true,
                'visit_policy' => 'Appointment Only',
                'notice' => 'Documents and parcels can be received at this location.',
                'is_primary' => false,
                'phone' => '+1 (941) 538-6941 ( Sending Parcel)',
                'whatsapp' => '+1 (646) 884-0271',
                'whatsappPreFill' => ''
            ], JSON_UNESCAPED_UNICODE),
            'icon' => 'MapPin',
            'sort_order' => 3,
            'is_active' => 1
        ],
        [
            'id' => 'd2105e40-b145-4245-87f9-c0040b12e0e2',
            'label' => 'United Kingdom Office',
            'type' => 'address',
            'value' => json_encode([
                'address' => 'Unit 9, Skyport Drive, Suite BD1724, West Drayton, Middlesex, UB7 0LB, United Kingdom',
                'flag' => '🇬🇧',
                'office_type' => 'UK Office',
                'receives_documents' => true,
                'receives_parcels' => true,
                'visit_policy' => 'Appointment Only',
                'notice' => 'Documents and parcels can be received at this location.',
                'is_primary' => false,
                'phone' => '+44 0175 321 0551',
                'whatsapp' => '+1 (646) 884-0271',
                'whatsappPreFill' => ''
            ], JSON_UNESCAPED_UNICODE),
            'icon' => 'MapPin',
            'sort_order' => 4,
            'is_active' => 1
        ],
        [
            'id' => '5df3a50e-1cf8-4f3c-8f47-2db0fa4fbe5a',
            'label' => 'Bangladesh Office',
            'type' => 'address',
            'value' => json_encode([
                'address' => 'Plot – 3 & 5, bti Celebration Point, Rd No 113/A, Gulshan, Dhaka-1212, Bangladesh',
                'flag' => '🇧🇩',
                'office_type' => 'Bangladesh Office',
                'receives_documents' => true,
                'receives_parcels' => true,
                'visit_policy' => 'Appointment Only',
                'notice' => '',
                'is_primary' => false,
                'phone' => '+8809658003831',
                'whatsapp' => '+1 (646) 884-0271',
                'whatsappPreFill' => ''
            ], JSON_UNESCAPED_UNICODE),
            'icon' => 'MapPin',
            'sort_order' => 5,
            'is_active' => 1
        ]
    ];
    
    $insertStmt = $pdo->prepare("INSERT INTO contact_info (id, label, type, value, icon, sort_order, is_active) VALUES (:id, :label, :type, :value, :icon, :sort_order, :is_active)");
    
    foreach ($newOffices as $o) {
        $insertStmt->execute($o);
        echo "Inserted office: {$o['label']}\n";
    }
    
    echo "SUCCESS: Production MySQL database synced successfully!";
} catch (Exception $e) {
    die("Database error: " . $e->getMessage());
}
