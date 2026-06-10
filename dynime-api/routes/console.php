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

