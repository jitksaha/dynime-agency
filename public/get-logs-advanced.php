<?php echo '<pre>'; $logFile = dirname(__DIR__) . '/dynime-api/storage/logs/laravel.log'; if (file_exists($logFile)) { echo 'Log file size: ' . filesize($logFile) . ' bytes
'; $lines = file($logFile); $lastLines = array_slice($lines, -100); echo implode('', $lastLines); } else { echo 'Log file does not exist at: ' . $logFile . '
'; } echo '</pre>';
