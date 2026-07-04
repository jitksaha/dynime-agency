<?php

namespace App\Console\Commands;

use App\Jobs\SyncJobsJob;
use App\Repositories\Contracts\JobRepositoryInterface;
use App\Services\Contracts\AtsProviderInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class FlowmingoSyncCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'flowmingo:sync {--queue : Dispatch the sync to the queue instead of running synchronously}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize job postings from Flowmingo ATS into local database';

    /**
     * Execute the console command.
     */
    public function handle(AtsProviderInterface $atsProvider, JobRepositoryInterface $jobRepository): int
    {
        if ($this->option('queue')) {
            $this->info('Dispatching Flowmingo sync to the queue...');
            SyncJobsJob::dispatch();
            $this->info('Sync jobs queued successfully.');
            return self::SUCCESS;
        }

        $this->info('Starting Flowmingo sync synchronously...');

        try {
            $jobs = $atsProvider->fetchJobs();
            $this->info(sprintf('Fetched %d jobs from Flowmingo.', count($jobs)));

            $results = $jobRepository->syncJobs($jobs);
            
            $this->info('Reconciliation completed:');
            $this->line(sprintf(' - Created: %d', $results['created']));
            $this->line(sprintf(' - Updated: %d', $results['updated']));
            $this->line(sprintf(' - Closed/Soft Deleted: %d', $results['deleted']));

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Synchronization failed: ' . $e->getMessage());
            Log::error('FlowmingoSyncCommand failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return self::FAILURE;
        }
    }
}
