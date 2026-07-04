<?php

namespace App\Services;

use App\DTOs\AtsJobDTO;
use App\Services\Contracts\AtsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\RequestException;
use Exception;

class FlowmingoService implements AtsProviderInterface
{
    protected string $apiUrl;
    protected string $apiKey;
    protected int $timeout;
    protected int $retryAttempts;
    protected int $retryDelayMs;

    public function __construct()
    {
        $this->apiUrl = (string) config('services.flowmingo.url') ?: (string) env('FLOWMINGO_API_URL', 'https://apis.flowmingo.ai/company');
        $this->apiKey = (string) config('services.flowmingo.key') ?: (string) env('FLOWMINGO_API_KEY', '');
        $this->timeout = (int) config('services.flowmingo.timeout', 10);
        $this->retryAttempts = (int) config('services.flowmingo.retries', 3);
        $this->retryDelayMs = (int) config('services.flowmingo.retry_delay', 100);
    }

    /**
     * Fetch all active jobs from Flowmingo.
     *
     * @return array<AtsJobDTO>
     * @throws Exception
     */
    public function fetchJobs(): array
    {
        if (empty($this->apiKey)) {
            Log::error('Flowmingo API integration error: API Key is not configured.');
            throw new Exception('Flowmingo API key not configured.');
        }

        try {
            // 1. Fetch organization info to compute portal URL
            $meResponse = Http::withHeaders([
                'X-Api-Key' => $this->apiKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeout)
            ->get("{$this->apiUrl}/integration/me/v1");

            if ($meResponse->failed()) {
                Log::error('Flowmingo /integration/me/v1 failed', [
                    'status' => $meResponse->status(),
                    'body' => $meResponse->body()
                ]);
                $meResponse->throw();
            }

            $meData = $meResponse->json();
            $orgId = $meData['organization_id'] ?? null;
            $orgHash = $orgId ? base64_encode((string) $orgId) : '';
            $fallbackApplyUrl = $orgHash ? "https://talent.flowmingo.ai/careers/{$orgHash}" : "https://talent.flowmingo.ai";

            // 2. Fetch Job Posts
            $postsResponse = Http::withHeaders([
                'X-Api-Key' => $this->apiKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeout)
            ->get("{$this->apiUrl}/integration/hiring/job-posts/v1");

            if ($postsResponse->failed()) {
                Log::error('Flowmingo /integration/hiring/job-posts/v1 failed', [
                    'status' => $postsResponse->status(),
                    'body' => $postsResponse->body()
                ]);
                $postsResponse->throw();
            }

            $postsData = $postsResponse->json();
            $jobPosts = $postsData['data'] ?? [];

            // 3. Fetch Interview Sets for mapping candidate apply links
            $setsResponse = Http::withHeaders([
                'X-Api-Key' => $this->apiKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeout)
            ->get("{$this->apiUrl}/integration/hiring/interview-sets/v1");

            $interviewSets = [];
            if ($setsResponse->successful()) {
                $setsData = $setsResponse->json();
                $interviewSets = $setsData['data'] ?? [];
            } else {
                Log::warning('Flowmingo /integration/hiring/interview-sets/v1 call failed, will fallback to careers page.');
            }

            $jobs = [];
            foreach ($jobPosts as $post) {
                if (empty($post['id']) || empty($post['title'])) {
                    continue;
                }

                $title = $post['title'];
                $postId = $post['id'];
                $status = (int) ($post['status'] ?? 1) === 1 ? 'open' : 'closed';

                // Find matching interview set of type 1 (AI Interview) to get a direct apply URL
                $applyUrl = $fallbackApplyUrl;
                $matchedSetId = null;

                foreach ($interviewSets as $set) {
                    if ((int) ($set['status'] ?? 1) !== 1 || (int) ($set['set_type'] ?? 1) !== 1) {
                        continue;
                    }

                    if ($this->isTitleMatch($title, $set['title'])) {
                        $matchedSetId = $set['id'];
                        break;
                    }
                }

                if ($matchedSetId) {
                    $applyUrl = "https://talent.flowmingo.ai/interview/{$matchedSetId}";
                }

                // Check remote status from title
                $isRemote = false;
                if (stripos($title, 'remote') !== false || stripos($title, 'hybrid') !== false) {
                    $isRemote = true;
                }

                // Parse into AtsJobDTO
                $jobs[] = new AtsJobDTO(
                    flowmingo_job_id: $postId,
                    title: $title,
                    slug: \Illuminate\Support\Str::slug($title),
                    department: 'General',
                    employment_type: 'Full-time',
                    location: $isRemote ? 'Remote' : 'Office',
                    salary_min: null,
                    salary_max: null,
                    salary_currency: null,
                    description: null,
                    responsibilities: null,
                    requirements: null,
                    benefits: null,
                    experience: null,
                    remote: $isRemote,
                    featured: false,
                    status: $status,
                    apply_url: $applyUrl,
                    published_at: $post['created_at'] ?? null
                );
            }

            return $jobs;

        } catch (\Throwable $e) {
            Log::error('Flowmingo fetchJobs failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw new Exception('Flowmingo API fetch failed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Determine if two titles match using a token keyword matching algorithm.
     */
    protected function isTitleMatch(string $titleA, string $titleB): bool
    {
        $clean = function (string $val) {
            $val = strtolower($val);
            $val = preg_replace('/[^a-z0-9\s]/', ' ', $val);
            $ignore = ['interview', 'set', 'evaluation', 'cv', 'eval', 'evaluation', 'test', 'challenge', 'assessment'];
            $words = explode(' ', $val);
            return array_filter($words, function ($w) use ($ignore) {
                return strlen($w) > 2 && !in_array($w, $ignore);
            });
        };

        $wordsA = $clean($titleA);
        $wordsB = $clean($titleB);

        if (empty($wordsA) || empty($wordsB)) {
            return false;
        }

        // Check if one contains all words of the other
        $intersect = array_intersect($wordsA, $wordsB);
        if (count($intersect) === count($wordsA) || count($intersect) === count($wordsB)) {
            return true;
        }

        // Or if they share at least 2 keywords
        return count($intersect) >= 2;
    }
}
