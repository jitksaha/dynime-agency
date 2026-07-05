<?php
/**
 * Fix Flowmingo apply_urls — updates ats_jobs table to use base64(com_project_id).
 * Runs a full re-sync by calling Flowmingo API and updating DB directly.
 * DELETE THIS FILE AFTER RUNNING.
 */

define('LARAVEL_START', microtime(true));
header('Content-Type: text/html; charset=utf-8');

$token = $_GET['token'] ?? '';
if ($token !== 'deploy_token_7782') {
    http_response_code(403);
    die('Forbidden');
}

echo "<h2>Flowmingo apply_url Fix</h2>";
echo "<pre>";

// ── Bootstrap Laravel ────────────────────────────────────────────────────────
try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

    // Boot the app without handling a request
    $request = \Illuminate\Http\Request::create('/up', 'GET');
    $app->instance('request', $request);
    $app->boot();

    echo "✓ Laravel booted\n";
} catch (\Throwable $e) {
    die("✗ Laravel boot failed: " . $e->getMessage());
}

// ── Load config ──────────────────────────────────────────────────────────────
$apiUrl  = config('services.flowmingo.url') ?: env('FLOWMINGO_API_URL', 'https://apis.flowmingo.ai/company');
$apiKey  = config('services.flowmingo.key') ?: env('FLOWMINGO_API_KEY', '');

if (empty($apiKey)) {
    die("✗ FLOWMINGO_API_KEY not configured");
}
echo "✓ API Key loaded: " . substr($apiKey, 0, 12) . "...\n";

// ── Fetch job-posts list from Flowmingo ─────────────────────────────────────
echo "\nFetching jobs from Flowmingo...\n";

$ch = curl_init("{$apiUrl}/integration/hiring/job-posts/v1");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_HTTPHEADER     => [
        "X-Api-Key: {$apiKey}",
        "Accept: application/json",
    ],
]);
$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 200) {
    die("✗ Flowmingo API returned HTTP {$status}: {$body}");
}

$response = json_decode($body, true);
$jobPosts = $response['data'] ?? [];

if (empty($jobPosts)) {
    die("✗ No jobs returned from Flowmingo.");
}

echo "✓ Got " . count($jobPosts) . " jobs from Flowmingo\n\n";

// ── Update each job in the database ─────────────────────────────────────────
$db = app(\Illuminate\Database\ConnectionInterface::class);
$updated = 0;
$errors  = 0;

foreach ($jobPosts as $postItem) {
    $jobId    = $postItem['id'] ?? null;
    $projId   = $postItem['com_project_id'] ?? $jobId;
    $title    = $postItem['title'] ?? '(unknown)';

    if (empty($jobId) || empty($projId)) {
        echo "  ⚠ Skipping job with missing id/com_project_id: {$title}\n";
        $errors++;
        continue;
    }

    // Build the correct apply URL
    $correctUrl = 'https://talent.flowmingo.ai/jobs/' . base64_encode($projId);

    try {
        $rows = $db->table('ats_jobs')
            ->where('flowmingo_job_id', $jobId)
            ->update([
                'apply_url'  => $correctUrl,
                'updated_at' => now(),
            ]);

        if ($rows > 0) {
            echo "  ✓ Updated: {$title}\n";
            echo "    com_project_id : {$projId}\n";
            echo "    apply_url      : {$correctUrl}\n\n";
            $updated++;
        } else {
            echo "  ⚠ Job not found in DB (may need full sync): {$title} (id: {$jobId})\n";
        }
    } catch (\Throwable $e) {
        echo "  ✗ DB error for {$title}: " . $e->getMessage() . "\n";
        $errors++;
    }
}

// ── Clear Laravel cache so new URLs are served ───────────────────────────────
echo "\nClearing job cache...\n";
try {
    \Illuminate\Support\Facades\Cache::flush();
    echo "✓ Cache flushed\n";
} catch (\Throwable $e) {
    echo "⚠ Cache flush failed (non-critical): " . $e->getMessage() . "\n";
}

echo "\n<strong>Done! Updated: {$updated} | Errors: {$errors}</strong>\n";
echo "</pre>";
echo "<p style='color:green;font-weight:bold;'>All apply_urls have been fixed. You can now delete this file via FTP or the next deploy will remove it.</p>";
