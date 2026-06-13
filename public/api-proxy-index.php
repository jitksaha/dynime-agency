<?php
/**
 * Laravel API Entry Point Proxy for Hostinger
 * Routes all /api/* requests to the dynime-api Laravel backend.
 *
 * File location: public_html/api/index.php
 * dynime-api is at:  <domain-root>/dynime-api/public/
 *                 = dirname(DOCUMENT_ROOT) . '/dynime-api/public'
 */

// DOCUMENT_ROOT = /home/u740731947/domains/dynime.com/public_html
// dirname        = /home/u740731947/domains/dynime.com
// dynime-api/public = /home/u740731947/domains/dynime.com/dynime-api/public
$docRoot          = $_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__);
$laravelPublicPath = dirname($docRoot) . '/dynime-api/public';

if (!is_dir($laravelPublicPath)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'error'    => 'Backend not deployed',
        'tried'    => $laravelPublicPath,
        'docRoot'  => $docRoot,
    ]);
    exit;
}

// Strip the /api prefix from REQUEST_URI so Laravel sees clean routes
// /api/site-settings  →  /site-settings
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
if (preg_match('#^/api(/?.*)$#', $requestUri, $m)) {
    $_SERVER['REQUEST_URI'] = $m[1] ?: '/';
}

// Set SCRIPT_FILENAME so Laravel bootstraps correctly
$_SERVER['SCRIPT_FILENAME'] = $laravelPublicPath . '/index.php';
$_SERVER['SCRIPT_NAME']     = '/index.php';

// Boot Laravel
chdir($laravelPublicPath);
require $laravelPublicPath . '/index.php';
