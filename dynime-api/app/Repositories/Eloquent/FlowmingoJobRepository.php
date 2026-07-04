<?php

namespace App\Repositories\Eloquent;

use App\DTOs\AtsJobDTO;
use App\Models\Job;
use App\Repositories\Contracts\JobRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FlowmingoJobRepository implements JobRepositoryInterface
{
    /**
     * Reconcile local jobs table with jobs list from ATS.
     *
     * @param array<AtsJobDTO> $jobs
     * @return array{created: int, updated: int, deleted: int}
     */
    public function syncJobs(array $jobs): array
    {
        $created = 0;
        $updated = 0;
        $deleted = 0;

        $activeAtsIds = [];

        DB::transaction(function () use ($jobs, &$created, &$updated, &$activeAtsIds) {
            foreach ($jobs as $dto) {
                $activeAtsIds[] = $dto->flowmingo_job_id;

                // Find existing job including soft-deleted ones (if a job was reopened)
                $job = Job::withTrashed()->where('flowmingo_job_id', $dto->flowmingo_job_id)->first();

                if (!$job) {
                    // Create new job
                    Job::create($dto->toArray());
                    $created++;
                } else {
                    // Check if it's soft-deleted and restore it
                    if ($job->trashed()) {
                        $job->restore();
                        $updated++;
                    }

                    // Check if fields changed
                    $dtoData = $dto->toArray();
                    $changed = false;

                    foreach ($dtoData as $key => $value) {
                        $original = $job->{$key};
                        if (is_array($original) || is_array($value)) {
                            if (json_encode($original) !== json_encode($value)) {
                                $changed = true;
                                break;
                            }
                        } else {
                            if ($original != $value) {
                                $changed = true;
                                break;
                            }
                        }
                    }

                    if ($changed) {
                        $job->update($dtoData);
                        $updated++;
                    }
                }
            }
        });

        // Soft delete jobs that are active locally but not in the ATS payload anymore (closed jobs)
        $jobsToSoftDelete = Job::where('status', 'open')
            ->whereNotIn('flowmingo_job_id', $activeAtsIds)
            ->get();

        foreach ($jobsToSoftDelete as $job) {
            $job->update(['status' => 'closed']);
            $job->delete(); // Soft delete
            $deleted++;
        }

        // Clear all job caches after sync
        $this->clearCache();

        return compact('created', 'updated', 'deleted');
    }

    /**
     * Get paginated and filtered list of active jobs.
     *
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator
     */
    public function search(array $filters): LengthAwarePaginator
    {
        $query = Job::query()->where('status', 'open');

        // Search text (title, department, description)
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filters
        if (!empty($filters['department'])) {
            $query->where('department', $filters['department']);
        }

        if (!empty($filters['location'])) {
            $query->where('location', $filters['location']);
        }

        if (!empty($filters['employment_type'])) {
            $query->where('employment_type', $filters['employment_type']);
        }

        if (isset($filters['featured'])) {
            $query->where('featured', filter_var($filters['featured'], FILTER_VALIDATE_BOOLEAN));
        }

        if (isset($filters['remote'])) {
            $query->where('remote', filter_var($filters['remote'], FILTER_VALIDATE_BOOLEAN));
        }

        // Sorting
        $sortField = $filters['sort_by'] ?? 'published_at';
        $sortDirection = $filters['sort_dir'] ?? 'desc';
        
        $allowedFields = ['title', 'department', 'published_at', 'salary_max'];
        if (!in_array($sortField, $allowedFields)) {
            $sortField = 'published_at';
        }

        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';
        
        $query->orderBy($sortField, $sortDirection);

        $perPage = (int) ($filters['per_page'] ?? 10);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }

    /**
     * Find an active job by slug.
     *
     * @param string $slug
     * @return Job|null
     */
    public function findBySlug(string $slug): ?Job
    {
        return Job::where('slug', $slug)
            ->where('status', 'open')
            ->first();
    }

    /**
     * Upsert a single job.
     *
     * @param AtsJobDTO $dto
     * @return Job
     */
    public function upsertJob(AtsJobDTO $dto): Job
    {
        $job = Job::withTrashed()->where('flowmingo_job_id', $dto->flowmingo_job_id)->first();
        $dtoData = $dto->toArray();

        if (!$job) {
            $job = Job::create($dtoData);
        } else {
            if ($job->trashed()) {
                $job->restore();
            }
            $job->update($dtoData);
        }

        $this->clearCache();

        return $job;
    }

    /**
     * Delete a single job by Flowmingo ID.
     *
     * @param string $flowmingoJobId
     * @return void
     */
    public function deleteJob(string $flowmingoJobId): void
    {
        $job = Job::where('flowmingo_job_id', $flowmingoJobId)->first();
        if ($job) {
            $job->update(['status' => 'closed']);
            $job->delete();
        }

        $this->clearCache();
    }

    /**
     * Clear all Redis/Cache entries related to jobs.
     */
    protected function clearCache(): void
    {
        Cache::flush();
    }
}
