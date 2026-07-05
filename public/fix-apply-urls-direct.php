<?php
/**
 * One-time fix: Update all ats_jobs apply_url to point directly to their Flowmingo AI interview sets.
 * Place in public_html (public/ in repo). DELETE AFTER RUNNING.
 */

$token = $_GET['token'] ?? '';
if ($token !== 'direct_fix_token_9934') {
    http_response_code(403);
    die('Forbidden');
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== Flowmingo Direct Interview URL Fix ===\n\n";

define('LARAVEL_START', microtime(true));

try {
    require_once __DIR__ . '/../dynime-api/vendor/autoload.php';
    $app = require_once __DIR__ . '/../dynime-api/bootstrap/app.php';
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo "✓ Laravel booted\n\n";
} catch (\Throwable $e) {
    die("✗ Laravel boot failed: " . $e->getMessage() . "\n");
}

$apiUrl = config('services.flowmingo.url') ?: env('FLOWMINGO_API_URL', 'https://apis.flowmingo.ai/company');
$apiKey = config('services.flowmingo.key') ?: env('FLOWMINGO_API_KEY', '');

if (empty($apiKey)) {
    die("✗ FLOWMINGO_API_KEY not configured\n");
}
echo "✓ API Key loaded\n";
echo "Fetching job posts from Flowmingo...\n\n";

// Fetch job posts (list)
$ch = curl_init("{$apiUrl}/integration/hiring/job-posts/v1");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_HTTPHEADER     => ["X-Api-Key: {$apiKey}", "Accept: application/json"],
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 200) {
    die("✗ Flowmingo API returned HTTP {$status}: {$body}\n");
}

$jobs = json_decode($body, true)['data'] ?? [];
if (empty($jobs)) {
    die("✗ No jobs returned from Flowmingo\n");
}
echo "✓ Got " . count($jobs) . " job posts\n\n";

// Fetch interview sets to map as fallback if com_interview_set_id is missing in detail
$chSets = curl_init("{$apiUrl}/integration/hiring/interview-sets/v1");
curl_setopt_array($chSets, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_HTTPHEADER     => ["X-Api-Key: {$apiKey}", "Accept: application/json"],
]);
$setsBody = curl_exec($chSets);
$setsStatus = curl_getinfo($chSets, CURLINFO_HTTP_CODE);
curl_close($chSets);

$interviewSets = [];
if ($setsStatus === 200) {
    $interviewSets = json_decode($setsBody, true)['data'] ?? [];
    echo "✓ Got " . count($interviewSets) . " interview sets\n";
} else {
    echo "⚠ Could not fetch interview sets (HTTP {$setsStatus}). Title matching mapping skipped.\n";
}

$db = app(\Illuminate\Database\ConnectionInterface::class);
$updated = 0;
$skipped = 0;

// Token match helper
$isTitleMatch = function (string $titleA, string $titleB) {
    $clean = function (string $val) {
        $val = strtolower($val);
        $val = preg_replace('/[^a-z0-9\s]/', ' ', $val);
        $ignore = ['interview', 'set', 'evaluation', 'cv', 'eval', 'test', 'challenge', 'assessment'];
        $words = explode(' ', $val);
        return array_filter($words, function ($w) use ($ignore) {
            return strlen($w) > 2 && !in_array($w, $ignore);
        });
    };
    $wordsA = $clean($titleA);
    $wordsB = $clean($titleB);
    if (empty($wordsA) || empty($wordsB)) return false;
    $intersect = array_intersect($wordsA, $wordsB);
    return count($intersect) === count($wordsA) || count($intersect) === count($wordsB) || count($intersect) >= 2;
};

foreach ($jobs as $jobItem) {
    $jobId = $jobItem['id'] ?? null;
    $title = $jobItem['title'] ?? '(unknown)';

    if (empty($jobId)) {
        echo "⚠ Skip (missing ID): {$title}\n";
        $skipped++;
        continue;
    }

    // Fetch full details to get com_interview_set_id
    $chDetail = curl_init("{$apiUrl}/integration/hiring/job-posts/{$jobId}/v1");
    curl_setopt_array($chDetail, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ["X-Api-Key: {$apiKey}", "Accept: application/json"],
    ]);
    $detailBody = curl_exec($chDetail);
    $detailStatus = curl_getinfo($chDetail, CURLINFO_HTTP_CODE);
    curl_close($chDetail);

    $interviewSetId = null;
    if ($detailStatus === 200) {
        $detailData = json_decode($detailBody, true);
        $interviewSetId = $detailData['com_interview_set_id'] ?? null;
    }

    // Title matching fallback if not returned directly
    if (empty($interviewSetId)) {
        foreach ($interviewSets as $set) {
            if ((int) ($set['status'] ?? 1) !== 1 || (int) ($set['set_type'] ?? 1) !== 1) {
                continue;
            }
            if ($isTitleMatch($title, $set['title'])) {
                $interviewSetId = $set['id'];
                break;
            }
        }
    }

    if (!empty($interviewSetId)) {
        $correctUrl = "https://talent.flowmingo.ai/interview/{$interviewSetId}";
    } else {
        $projId = $jobItem['com_project_id'] ?? $jobId;
        $correctUrl = 'https://talent.flowmingo.ai/jobs/' . base64_encode($projId);
    }

    $rows = $db->table('ats_jobs')
        ->where('flowmingo_job_id', $jobId)
        ->update(['apply_url' => $correctUrl, 'updated_at' => now()]);

    if ($rows > 0) {
        echo "✓ {$title}\n";
        echo "  apply_url → {$correctUrl}\n";
        $updated++;
    } else {
        echo "⚠ Not in DB (needs full sync): {$title}\n";
        $skipped++;
    }
}

// Flush cache
try {
    \Illuminate\Support\Facades\Cache::flush();
    echo "\n✓ Cache flushed\n";
} catch (\Throwable $e) {
    echo "\n⚠ Cache flush: " . $e->getMessage() . "\n";
}

echo "\n=== Done: Updated {$updated}, Skipped {$skipped} ===\n";

// Self-delete for security
@unlink(__FILE__);
echo "Script deleted itself.\n";
