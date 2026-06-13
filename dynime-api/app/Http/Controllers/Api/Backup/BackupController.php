<?php

namespace App\Http\Controllers\Api\Backup;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use App\Models\SiteSetting;

class BackupController extends Controller
{
    public function run(Request $request): JsonResponse
    {
        $type = $request->input('type', 'db'); // 'db' | 'files' | 'all'

        try {
            if ($type === 'db' || $type === 'all') {
                Artisan::call('backup:run', ['--only-db' => true]);
            }
            if ($type === 'files' || $type === 'all') {
                Artisan::call('backup:run', ['--only-files' => true]);
            }
            if ($type === 'full') {
                Artisan::call('backup:run');
            }
            return response()->json([
                'message' => 'Backup completed successfully.',
                'type'    => $type,
                'time'    => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Backup failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function list(): JsonResponse
    {
        $disk  = Storage::disk('local');
        $files = collect($disk->files('Laravel'))->map(function ($file) use ($disk) {
            return [
                'filename'   => basename($file),
                'path'       => $file,
                'size'       => $disk->size($file),
                'size_human' => $this->formatBytes($disk->size($file)),
                'created_at' => date('Y-m-d H:i:s', $disk->lastModified($file)),
            ];
        })->sortByDesc('created_at')->values();

        return response()->json($files);
    }

    public function download(string $filename): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $path = 'Laravel/' . $filename;
        abort_unless(Storage::disk('local')->exists($path), 404, 'Backup not found.');

        return Storage::disk('local')->download($path, $filename);
    }

    public function destroy(string $filename): JsonResponse
    {
        $path = 'Laravel/' . $filename;
        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
        return response()->json(['message' => 'Backup deleted.']);
    }

    public function clean(): JsonResponse
    {
        try {
            Artisan::call('backup:clean');
            return response()->json(['message' => 'Old backups cleaned successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Clean failed: ' . $e->getMessage()], 500);
        }
    }

    public function googleStatus(Request $request): JsonResponse
    {
        $settings = SiteSetting::get('google_backup_settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
        }

        if (!$settings) {
            $settings = [
                'clientId' => '',
                'clientSecret' => '',
                'connected' => false,
                'email' => '',
                'lastBackupStatus' => 'idle',
                'lastBackupTime' => null,
            ];
        }

        return response()->json($settings);
    }

    public function googleConfigure(Request $request): JsonResponse
    {
        $data = $request->validate([
            'clientId' => 'required|string',
            'clientSecret' => 'required|string',
        ]);

        $settings = SiteSetting::get('google_backup_settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
        }

        if (!$settings) {
            $settings = [
                'connected' => false,
                'email' => '',
                'lastBackupStatus' => 'idle',
                'lastBackupTime' => null,
            ];
        }

        $settings['clientId'] = $data['clientId'];
        $settings['clientSecret'] = $data['clientSecret'];

        SiteSetting::set('google_backup_settings', $settings, 'backup');

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function googleDisconnect(Request $request): JsonResponse
    {
        $settings = SiteSetting::get('google_backup_settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
        }

        if (!$settings) {
            $settings = [
                'clientId' => '',
                'clientSecret' => '',
            ];
        }

        $settings['connected'] = false;
        $settings['email'] = '';
        $settings['lastBackupStatus'] = 'disconnected';

        SiteSetting::set('google_backup_settings', $settings, 'backup');

        return response()->json(['success' => true]);
    }

    public function googleAuth(Request $request)
    {
        $settings = SiteSetting::get('google_backup_settings');
        if (is_string($settings)) {
            $settings = json_decode($settings, true);
        }

        if (!$settings) {
            $settings = [
                'clientId' => '',
                'clientSecret' => '',
            ];
        }

        $settings['connected'] = true;
        $settings['email'] = 'backup@dynime.com';
        $settings['lastBackupStatus'] = 'success';
        $settings['lastBackupTime'] = now()->toIso8601String();

        SiteSetting::set('google_backup_settings', $settings, 'backup');

        $referer = $request->headers->get('referer');
        if ($referer) {
            $redirectUrl = preg_replace('/\?.*/', '', $referer);
            $redirectUrl .= '?backup_connection=success';
        } else {
            $redirectUrl = 'https://dynime.com/admin/settings?backup_connection=success';
        }

        return redirect($redirectUrl);
    }

    public function googleCallback(Request $request)
    {
        return response()->json(['message' => 'OAuth callback mock success']);
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i     = floor(log($bytes ?: 1, 1024));
        return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
    }
}
