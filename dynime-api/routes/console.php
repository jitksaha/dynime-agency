<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Dynime Scheduled Tasks
|--------------------------------------------------------------------------
|
| These tasks run via the cPanel cron job:
|   * * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
|
*/

// Daily database backup at 2:00 AM
Schedule::command('backup:run --only-db')
    ->dailyAt('02:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/backup.log'));

// Daily files backup at 2:30 AM
Schedule::command('backup:run --only-files')
    ->dailyAt('02:30')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/backup.log'));

// Clean old backups daily at 1:00 AM
Schedule::command('backup:clean')
    ->dailyAt('01:00')
    ->withoutOverlapping();

// Process queue jobs every 5 minutes (shared hosting compatible — no daemon)
Schedule::command('queue:work --stop-when-empty --max-jobs=50 --max-time=240')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Regenerate sitemap cache weekly
Schedule::call(function () {
    \Illuminate\Support\Facades\Cache::forget('sitemap_xml');
})->weekly()->sundays()->at('03:00');

// Process abandoned checkouts every 30 minutes
Schedule::command('email:send-abandoned')
    ->everyThirtyMinutes()
    ->withoutOverlapping();

Artisan::command('storage:sync-to-r2', function () {
    $this->info('Starting migration of local public files to Cloudflare R2...');

    $localPath = storage_path('app/public');
    if (!\Illuminate\Support\Facades\File::exists($localPath)) {
        $this->error('Local public storage directory does not exist.');
        return;
    }

    $files = \Illuminate\Support\Facades\File::allFiles($localPath);
    $count = count($files);
    $this->info("Found {$count} files to sync.");

    $bar = $this->output->createProgressBar($count);
    $bar->start();

    $success = 0;
    $failed = 0;

    foreach ($files as $file) {
        $filePath = $file->getRealPath();
        $relativePath = str_replace($localPath . DIRECTORY_SEPARATOR, '', $filePath);
        
        // Normalize slashes for S3/R2 compatibility
        $relativePath = str_replace(DIRECTORY_SEPARATOR, '/', $relativePath);

        try {
            $content = \Illuminate\Support\Facades\File::get($filePath);
            
            // Upload to the public disk (configured as R2/S3 on live)
            \Illuminate\Support\Facades\Storage::disk('public')->put($relativePath, $content);
            $success++;
        } catch (\Exception $e) {
            $this->error("\nFailed to sync: {$relativePath}. Error: " . $e->getMessage());
            $failed++;
        }

        $bar->advance();
    }

    $bar->finish();
    $this->info("\nSync completed. Success: {$success}, Failed: {$failed}");
})->purpose('Sync all existing local public storage files to Cloudflare R2 bucket');


