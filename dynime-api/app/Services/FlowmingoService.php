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
            }
            // Fetch public seeker jobs for salary enrichment
            $publicJobsMap = [];
            if ($orgId) {
                try {
                    $publicResponse = Http::withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ])
                    ->timeout($this->timeout)
                    ->get("https://apis.flowmingo.ai/seeker/post/jobs?organization_id={$orgId}&page=1&limit=200");

                    if ($publicResponse->successful()) {
                        $publicData = $publicResponse->json();
                        $items = $publicData['items'] ?? [];
                        foreach ($items as $item) {
                            if (!empty($item['id'])) {
                                $publicJobsMap[$item['id']] = $item;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to fetch public seeker jobs for salary enrichment: " . $e->getMessage());
                }
            }

            $jobs = [];
            foreach ($jobPosts as $postItem) {
                if (empty($postItem['id']) || empty($postItem['title'])) {
                    continue;
                }

                $postId = $postItem['id'];

                // Fetch full details of the job post since the list only returns ID and Title
                $postDetailResponse = Http::withHeaders([
                    'X-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ])
                ->timeout($this->timeout)
                ->get("{$this->apiUrl}/integration/hiring/job-posts/{$postId}/v1");

                if ($postDetailResponse->successful()) {
                    $detailData = $postDetailResponse->json();
                    // Merge: start with list item (which has com_project_id) then overlay detail fields
                    // This prevents the detail response from accidentally losing com_project_id
                    $post = array_merge($postItem, $detailData ?: []);
                } else {
                    $post = $postItem;
                }

                // Enrich with public data (salary info) if available
                if (isset($publicJobsMap[$postId])) {
                    $pubJob = $publicJobsMap[$postId];
                    $post['salary_min'] = $pubJob['salary_min'] ?? null;
                    $post['salary_max'] = $pubJob['salary_max'] ?? null;
                    $post['salary_currency'] = $pubJob['salary_currency'] ?? null;
                    $post['salary_period'] = $pubJob['salary_period'] ?? null;
                }

                $title = $post['title'] ?? $postItem['title'];

                // Map status: 1 = open/active, anything else = closed
                $statusVal = $post['status'] ?? 1;
                $status = ((int) $statusVal === 1 || $statusVal === true || $statusVal === 'active' || $statusVal === 'open') ? 'open' : 'closed';

                // Prioritize Direct Interview URL over generic job listing page
                $interviewSetId = $post['com_interview_set_id'] ?? $postItem['com_interview_set_id'] ?? null;

                if (empty($interviewSetId)) {
                    // Try mapping from title in interviewSets array
                    foreach ($interviewSets as $set) {
                        if ((int) ($set['status'] ?? 1) !== 1 || (int) ($set['set_type'] ?? 1) !== 1) {
                            continue;
                        }
                        if ($this->isTitleMatch($title, $set['title'])) {
                            $interviewSetId = $set['id'];
                            break;
                        }
                    }
                }

                if (!empty($interviewSetId)) {
                    $applyUrl = "https://talent.flowmingo.ai/interview/{$interviewSetId}";
                } else {
                    $projId = $postItem['com_project_id'] ?? $post['com_project_id'] ?? null;
                    if (empty($projId)) {
                        Log::warning("Flowmingo: com_project_id missing for job '{$postId}' ({$title}). Falling back to job ID.");
                        $projId = $postId;
                    }
                    $applyUrl = "https://talent.flowmingo.ai/jobs/" . base64_encode($projId);
                }

                // ─── Extract all available fields from API response ───────────────
                // Location: try various field names Flowmingo might use
                $location = $post['location'] ?? $post['work_location'] ?? $post['office_location'] ?? null;
                if (empty($location)) {
                    $location = 'Hybrid'; // Sensible default
                }

                // Employment type
                $employmentType = $post['employment_type']
                    ?? $post['job_type']
                    ?? $post['contract_type']
                    ?? 'Full-time';

                // Department / Category
                $department = $post['department']
                    ?? $post['category']
                    ?? $post['team']
                    ?? $post['group']
                    ?? 'General';

                // Experience level
                $experience = $post['experience_level']
                    ?? $post['experience']
                    ?? $post['seniority']
                    ?? $post['level']
                    ?? null;

                // Salary
                $salaryMin  = $post['salary_min'] ?? $post['min_salary'] ?? null;
                $salaryMax  = $post['salary_max'] ?? $post['max_salary'] ?? null;
                $salaryCurr = $post['salary_currency'] ?? $post['currency'] ?? null;
                $salaryPeriod = $post['salary_period'] ?? null;
                // Some ATS return salary as a formatted string
                $salaryStr  = $post['salary'] ?? $post['salary_range'] ?? null;
                if ($salaryStr && !$salaryMin && !$salaryMax) {
                    // e.g. "USD 1,800 – 3,600 / year" — store as salary_currency field for display
                    $salaryCurr = is_string($salaryStr) ? $salaryStr : $salaryCurr;
                }

                // Description / responsibilities / requirements
                $description     = $post['description'] ?? $post['summary'] ?? $post['job_description'] ?? null;
                $responsibilities = null;
                $requirements     = null;
                $benefits         = null;
                if (!empty($post['responsibilities'])) {
                    $r = $post['responsibilities'];
                    $responsibilities = is_array($r) ? $r : (is_string($r) ? array_filter(explode("\n", $r)) : null);
                }
                if (!empty($post['requirements'])) {
                    $r = $post['requirements'];
                    $requirements = is_array($r) ? $r : (is_string($r) ? array_filter(explode("\n", $r)) : null);
                }
                if (!empty($post['benefits'])) {
                    $b = $post['benefits'];
                    $benefits = is_array($b) ? $b : (is_string($b) ? array_filter(explode("\n", $b)) : null);
                }

                // Remote flag
                $isRemote = (bool) ($post['is_remote'] ?? $post['remote'] ?? false);
                if (!$isRemote) {
                    $loc = strtolower($location);
                    $isRemote = str_contains($loc, 'remote') || str_contains($loc, 'hybrid');
                }
                if (!$isRemote && stripos($title, 'remote') !== false) {
                    $isRemote = true;
                }

                // Published date
                $publishedAt = $post['published_at'] ?? $post['created_at'] ?? null;

                // Parse into AtsJobDTO
                $jobs[] = new AtsJobDTO(
                    flowmingo_job_id: $postId,
                    title:            $title,
                    slug:             \Illuminate\Support\Str::slug($title),
                    department:       $department,
                    employment_type:  $employmentType,
                    location:         $location,
                    salary_min:       $salaryMin ? (float) $salaryMin : null,
                    salary_max:       $salaryMax ? (float) $salaryMax : null,
                    salary_currency:  $salaryCurr,
                    salary_period:    $salaryPeriod,
                    description:      $description,
                    responsibilities: $responsibilities,
                    requirements:     $requirements,
                    benefits:         $benefits,
                    experience:       $experience,
                    remote:           $isRemote,
                    featured:         (bool) ($post['featured'] ?? $post['is_featured'] ?? false),
                    status:           $status,
                    apply_url:        $applyUrl,
                    published_at:     $publishedAt
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
