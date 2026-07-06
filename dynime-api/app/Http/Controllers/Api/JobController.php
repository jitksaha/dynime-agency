<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobSearchRequest;
use App\Http\Resources\JobResource;
use App\Repositories\Contracts\JobRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class JobController extends Controller
{
    public function __construct(
        protected JobRepositoryInterface $jobRepository
    ) {}

    /**
     * Display a listing of active jobs with filtering and pagination.
     */
    public function index(JobSearchRequest $request): JsonResponse
    {
        $params = $request->validated();
        
        // Build a unique cache key based on validated parameters
        $cacheKey = 'jobs_list_' . md5(serialize($params));

        $jobs = Cache::remember($cacheKey, 3600, function () use ($params, $request) {
            $paginator = $this->jobRepository->search($params);
            
            return [
                'data' => JobResource::collection($paginator->items())->toArray($request),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ]
            ];
        });

        return response()->json($jobs);
    }

    /**
     * Display the specified job by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $cacheKey = 'job_detail_' . md5($slug);

        $jobData = Cache::remember($cacheKey, 3600, function () use ($slug) {
            $job = $this->jobRepository->findBySlug($slug);
            
            if (!$job) {
                return null;
            }

            return (new JobResource($job))->resolve();
        });

        if (!$jobData) {
            return response()->json([
                'message' => 'Job not found or no longer active.'
            ], 404);
        }

        return response()->json($jobData);
    }

    /**
     * Manually trigger sync with Flowmingo ATS.
     */
    public function sync(\App\Services\Contracts\AtsProviderInterface $atsProvider): JsonResponse
    {
        try {
            $jobs = $atsProvider->fetchJobs();
            $results = $this->jobRepository->syncJobs($jobs);

            // Clear cache for jobs list and detail
            Cache::flush();

            return response()->json([
                'message' => 'Sync completed successfully.',
                'stats' => $results
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Manual Flowmingo Sync failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
