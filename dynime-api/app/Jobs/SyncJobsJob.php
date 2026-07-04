<?php

namespace App\Jobs;

use App\Repositories\Contracts\JobRepositoryInterface;
use App\Services\Contracts\AtsProviderInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncJobsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(AtsProviderInterface $atsProvider, JobRepositoryInterface $jobRepository): void
    {
        Log::info('Flowmingo Sync: Starting synchronization job...');

        try {
            $jobs = $atsProvider->fetchJobs();
            
            $results = $jobRepository->syncJobs($jobs);

            Log::info('Flowmingo Sync: Sync completed successfully.', $results);

        } catch (Throwable $e) {
            Log::error('Flowmingo Sync: Job attempt failed: ' . $e->getMessage(), [
                'attempt' => $this->attempts(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Throwable $exception): void
    {
        Log::critical('Flowmingo Sync: Sync job permanently failed after max retries.', [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
