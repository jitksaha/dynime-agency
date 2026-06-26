<?php
/**
 * Origin server fallback — placed at public_html/index.php on Hostinger.
 * This prevents cPanel from redirecting to /cgi-sys/defaultwebpage.cgi
 * when the origin server is hit directly (bypassing Cloudflare CDN).
 *
 * The React SPA is served from Cloudflare R2/CDN, not this origin server.
 * This file simply ensures direct origin hits still serve the correct domain.
 */

// If somehow loaded directly, redirect to canonical URL
$host = $_SERVER['HTTP_HOST'] ?? 'dynime.com';
$uri  = $_SERVER['REQUEST_URI'] ?? '/';

// Strip port if present
$host = preg_replace('/:\d+$/', '', $host);

// If it's not the canonical domain, redirect
if ($host !== 'dynime.com' && $host !== 'www.dynime.com') {
    http_response_code(301);
    header('Location: https://dynime.com' . $uri);
    exit;
}

// Serve a minimal HTML shell — Cloudflare CDN will normally serve the full app.
// This is only reached when PSI or bots hit the origin directly.
http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');

echo <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dynime Inc.</title>
  <meta http-equiv="refresh" content="0; url=https://dynime.com/" />
  <link rel="canonical" href="https://dynime.com/" />
</head>
<body>
  <p>Loading <a href="https://dynime.com/">Dynime Inc.</a>…</p>
</body>
</html>
HTML;
exit;
