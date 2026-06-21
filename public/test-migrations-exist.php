<?php
header('Content-Type: text/plain');
$files = glob(dirname(__DIR__) . '/dynime-api/database/migrations/*.php');
foreach ($files as $file) {
    echo basename($file) . "\n";
}
