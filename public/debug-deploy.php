<?php
$token = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    die('Forbidden');
}

echo "<h3>Debug Deploy Script</h3>";

$zipFile = '/home/u740731947/domains/dynime.com/public_html/dynime-api.zip';
if (file_exists($zipFile)) {
    echo "Zip file exists: Yes<br/>";
    echo "Zip file size: " . filesize($zipFile) . " bytes<br/>";
    echo "Zip file modified: " . date("Y-m-d H:i:s", filemtime($zipFile)) . "<br/>";
} else {
    echo "Zip file exists: No<br/>";
}

$migrationFile = '/home/u740731947/domains/dynime.com/dynime-api/database/migrations/2026_06_21_100000_create_coupons_table.php';
if (file_exists($migrationFile)) {
    echo "Migration file exists: Yes<br/>";
    echo "Migration file size: " . filesize($migrationFile) . " bytes<br/>";
    echo "Migration file modified: " . date("Y-m-d H:i:s", filemtime($migrationFile)) . "<br/>";
    echo "<h4>Migration File Content:</h4>";
    echo "<pre>" . htmlspecialchars(file_get_contents($migrationFile)) . "</pre>";
} else {
    echo "Migration file exists: No<br/>";
}
