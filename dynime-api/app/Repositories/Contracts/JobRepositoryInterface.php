<?php

namespace App\Repositories\Contracts;

use App\Models\Job;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface JobRepositoryInterface
{
    /**
     * Reconcile local jobs table with jobs list from ATS.
     *
     * @param array<\App\DTOs\AtsJobDTO> $jobs
     * @return array{created: int, updated: int, deleted: int}
     */
    public function syncJobs(array $jobs): array;

    /**
     * Get paginated and filtered list of active jobs.
     *
     * @param array<string, mixed> $filters
     * @return LengthAwarePaginator
     */
    public function search(array $filters): LengthAwarePaginator;

    /**
     * Find an active job by slug.
     *
     * @param string $slug
     * @return Job|null
     */
    public function findBySlug(string $slug): ?Job;

    /**
     * Upsert a single job.
     *
     * @param \App\DTOs\AtsJobDTO $job
     * @return Job
     */
    public function upsertJob(\App\DTOs\AtsJobDTO $job): Job;

    /**
     * Delete a single job by Flowmingo ID.
     *
     * @param string $flowmingoJobId
     * @return void
     */
    public function deleteJob(string $flowmingoJobId): void;
}
