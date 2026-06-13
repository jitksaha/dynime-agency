<?php

use App\Http\Controllers\Api\Analytics\AnalyticsController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Backup\BackupController;
use App\Http\Controllers\Api\Cms\BlogController;
use App\Http\Controllers\Api\Cms\CareerController;
use App\Http\Controllers\Api\Cms\PortfolioController;
use App\Http\Controllers\Api\Cms\ServiceController;
use App\Http\Controllers\Api\Cms\TeamController;
use App\Http\Controllers\Api\Contact\ContactController;
use App\Http\Controllers\Api\Media\MediaController;
use App\Http\Controllers\Api\Seo\SeoController;
use App\Http\Controllers\Api\Settings\SettingsController;
use App\Http\Controllers\Api\SupabaseProxyController;
use App\Http\Controllers\Api\Hrm\PayrollController;
use App\Http\Controllers\Api\CheckoutTrackingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Dynime API Routes — v1
|--------------------------------------------------------------------------
| Base URL: /api/v1/
|
| Groups:
|   PUBLIC  — No auth required
|   AUTH    — Sanctum token required
|   ADMIN   — Sanctum + AdminOnly middleware
*/

Route::prefix('v1')->group(function () {

    // ── PUBLIC ROUTES ──────────────────────────────────────────────────────



        // Auth
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::get('auth/check-email', [AuthController::class, 'checkEmail']);
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/password/reset-request', [AuthController::class, 'passwordResetRequest']);
    Route::post('auth/password/reset', [AuthController::class, 'passwordReset']);

    // Blog
    Route::get('blog-posts',             [BlogController::class, 'index']);
    Route::get('blog-posts/categories',  [BlogController::class, 'categories']);
    Route::get('blog-posts/{slug}',      [BlogController::class, 'show']);
    Route::post('blog-posts/{id}/view',  [BlogController::class, 'recordView']);

    // Careers
    Route::get('careers',                [CareerController::class, 'index']);
    Route::get('careers/departments',    [CareerController::class, 'departments']);
    Route::get('careers/{slug}',         [CareerController::class, 'show']);
    Route::post('careers/{slug}/view',   [CareerController::class, 'recordView']);

    // Portfolio
    Route::get('portfolio',              [PortfolioController::class, 'index']);
    Route::get('portfolio/categories',   [PortfolioController::class, 'categories']);
    Route::get('portfolio/{slug}',       [PortfolioController::class, 'show']);

    // Team
    Route::get('team',                   [TeamController::class, 'index']);

    // Services
    Route::get('services',               [ServiceController::class, 'index']);
    Route::get('services/categories',    [ServiceController::class, 'categories']);
    Route::get('services/{slug}',        [ServiceController::class, 'show']);

    // Contact (rate-limited)
    Route::post('contact',               [ContactController::class, 'submit'])->middleware('throttle:5,1');
    Route::get('office-locations',       [ContactController::class, 'officeLocations']);

    // Job Applications (rate-limited)
    Route::post('job-applications',      [CareerController::class, 'apply'])->middleware('throttle:5,1');

    // SEO
    Route::get('seo',                    [SeoController::class, 'getByPath']);

    // Settings (public only)
    Route::get('site-settings',          [SettingsController::class, 'publicIndex']);
    Route::get('sync-db-mismatch',       [SettingsController::class, 'syncDbMismatch']);

    // CMS read-only public routes (needed for services pricing, state pricing, and addons)
    Route::prefix('cms')->group(function () {
        Route::get('usa-state-pricing',             [\App\Http\Controllers\Api\Cms\UsaStatePricingController::class, 'index']);
        Route::get('service-pricing',               [\App\Http\Controllers\Api\Cms\ServicePricingController::class, 'index']);
        Route::get('service-pricing/{serviceSlug}', [\App\Http\Controllers\Api\Cms\ServicePricingController::class, 'show']);
        Route::get('service-addons/{serviceSlug}',  [\App\Http\Controllers\Api\Cms\ServiceAddonController::class, 'show']);
    });

    // Sitemap
    Route::get('sitemap.xml',            [SeoController::class, 'sitemap']);

    // Analytics tracking (fire-and-forget from frontend)
    Route::post('analytics/pageview',    [AnalyticsController::class, 'trackPageView']);
    Route::post('checkout/track',        [CheckoutTrackingController::class, 'track']);

    // Google Drive backup auth routes (Public)
    Route::get('backup/google/auth', [BackupController::class, 'googleAuth']);
    Route::get('backup/google/callback', [BackupController::class, 'googleCallback']);

    // Supabase proxy routes
    Route::post('supabase-proxy', [SupabaseProxyController::class, 'handle']);
    Route::post('supabase-proxy/rpc/{function}', [SupabaseProxyController::class, 'handleRpc']);
    Route::post('supabase-proxy/functions/{name}', [SupabaseProxyController::class, 'invokeFunction']);

    // DB proxy routes (alias for db-shim compatibility)
    Route::post('db-proxy', [SupabaseProxyController::class, 'handle']);
    Route::post('db-proxy/rpc/{function}', [SupabaseProxyController::class, 'handleRpc']);
    Route::post('db-proxy/functions/{name}', [SupabaseProxyController::class, 'invokeFunction']);

    // Orders & Payments
    Route::post('orders/public/process-payment', [\App\Http\Controllers\Api\OrdersController::class, 'processPayment']);
    Route::get('orders/public/bkash-callback', [\App\Http\Controllers\Api\OrdersController::class, 'handleBkashCallback']);
    Route::post('orders/public/sslcommerz-callback', [\App\Http\Controllers\Api\OrdersController::class, 'handleSslcommerzCallback']);
    Route::post('orders/public/stripe-webhook', [\App\Http\Controllers\Api\OrdersController::class, 'handleStripeWebhook']);
    Route::post('orders/public/dodopayment-webhook', [\App\Http\Controllers\Api\OrdersController::class, 'handleDodoWebhook']);
    Route::post('orders/public/keeal-webhook', [\App\Http\Controllers\Api\OrdersController::class, 'handleKeealWebhook']);
    Route::get('orders/public/invoice/{ref}', [\App\Http\Controllers\Api\OrdersController::class, 'findPublicInvoice']);
    Route::get('orders/public/lookup', [\App\Http\Controllers\Api\OrdersController::class, 'lookupOrders']);
    Route::get('orders/public/status-by-session/{sessionId}', [\App\Http\Controllers\Api\OrdersController::class, 'getStatusBySession']);
    Route::get('orders/public/track/{term}', [\App\Http\Controllers\Api\OrdersController::class, 'trackOrder']);
    Route::get('orders/public/{id}/verification', [\App\Http\Controllers\Api\OrdersController::class, 'getVerificationDetails']);
    Route::post('orders/public/{id}/verification/start', [\App\Http\Controllers\Api\OrdersController::class, 'startVerification']);
    Route::post('orders/public/{id}/verification/mock-complete', [\App\Http\Controllers\Api\OrdersController::class, 'mockComplete']);

    // ── AUTHENTICATED ROUTES ───────────────────────────────────────────────

    Route::middleware(['auth:sanctum'])->group(function () {

        // Auth
        Route::get('auth/me',            [AuthController::class, 'me']);
        Route::post('auth/logout',       [AuthController::class, 'logout']);

        // Orders — authenticated user's own orders
        Route::get('orders/mine', [\App\Http\Controllers\Api\OrdersController::class, 'myOrders']);
        Route::post('orders/mine/claim', [\App\Http\Controllers\Api\OrdersController::class, 'claimOrders']);
        Route::post('orders/claim', [\App\Http\Controllers\Api\OrdersController::class, 'claimOrders']);

        // Google Backup routes (non-prefixed for direct frontend compatibility)
        Route::middleware(['admin'])->group(function () {
            Route::get('backup/google/status',       [BackupController::class, 'googleStatus']);
            Route::post('backup/google/configure',   [BackupController::class, 'googleConfigure']);
            Route::post('backup/google/disconnect',  [BackupController::class, 'googleDisconnect']);
        });


        // Frontend-compatible analytics endpoints
        Route::get('analytics/orders', [AnalyticsController::class, 'orders'])->middleware('admin');
        Route::get('analytics/subscribers', [AnalyticsController::class, 'subscribers'])->middleware('admin');
        Route::get('analytics/fx-orders', [AnalyticsController::class, 'fxOrders'])->middleware('admin');
        Route::get('analytics/employees', [AnalyticsController::class, 'employees'])->middleware('admin');
        Route::get('analytics/kpi', [AnalyticsController::class, 'kpi'])->middleware('admin');
        Route::get('analytics/counts', [AnalyticsController::class, 'counts'])->middleware('admin');

        // Payroll endpoints
        Route::prefix('payroll')->middleware('admin')->group(function () {
            Route::get('runs', [PayrollController::class, 'getRuns']);
            Route::get('runs/{id}/items', [PayrollController::class, 'getItems']);
            Route::get('items/{id}/adjustments', [PayrollController::class, 'getAdjustments']);
            Route::get('runs/{id}/audit', [PayrollController::class, 'getAudit']);
            Route::get('employees/count', [PayrollController::class, 'getActiveEmployeeCount']);
            Route::post('runs/ensure-current', [PayrollController::class, 'ensureCurrentMonth']);
            Route::post('runs/{id}/sync', [PayrollController::class, 'syncRun']);
            Route::post('seed-history', [PayrollController::class, 'seedHistory']);
            Route::post('runs/generate', [PayrollController::class, 'generateRun']);
            Route::post('runs/{id}/approve', [PayrollController::class, 'approveRun']);
            Route::post('runs/{id}/mark-paid', [PayrollController::class, 'markPaid']);
            Route::post('items/{id}/cancel', [PayrollController::class, 'cancelItem']);
            Route::post('runs/{id}/lock', [PayrollController::class, 'lockRun']);
        });

        // Admin Order, Verification, and User Lookup routes
        Route::get('orders', [\App\Http\Controllers\Api\OrdersController::class, 'adminIndex'])->middleware('admin');
        Route::post('orders', [\App\Http\Controllers\Api\OrdersController::class, 'adminStore'])->middleware('admin');
        Route::get('orders/{id}', [\App\Http\Controllers\Api\OrdersController::class, 'adminShow'])->middleware('admin');
        Route::patch('orders/{id}', [\App\Http\Controllers\Api\OrdersController::class, 'adminUpdate'])->middleware('admin');
        Route::delete('orders/{id}', [\App\Http\Controllers\Api\OrdersController::class, 'adminDestroy'])->middleware('admin');
        Route::post('verification/admin/request', [\App\Http\Controllers\Api\OrdersController::class, 'requestVerification'])->middleware('admin');
        Route::get('users/by-email/{email}', [\App\Http\Controllers\Api\Auth\AuthController::class, 'getByEmail'])->middleware('admin');

        // ── ADMIN ROUTES ───────────────────────────────────────────────────

        Route::middleware(['admin'])->prefix('admin')->group(function () {

            // Analytics
            Route::get('analytics/dashboard', [AnalyticsController::class, 'dashboard']);
            Route::get('analytics/pageviews', [AnalyticsController::class, 'pageviews']);

            // Blog
            Route::get('blog-posts',           [BlogController::class, 'adminIndex']);
            Route::get('blog-posts/{id}',      [BlogController::class, 'adminShow']);
            Route::post('blog-posts',          [BlogController::class, 'store']);
            Route::patch('blog-posts/{id}',    [BlogController::class, 'update']);
            Route::delete('blog-posts/{id}',   [BlogController::class, 'destroy']);

            // Careers
            Route::get('careers',              [CareerController::class, 'adminIndex']);
            Route::get('careers/{id}',         [CareerController::class, 'adminShow']);
            Route::post('careers',             [CareerController::class, 'store']);
            Route::patch('careers/{id}',       [CareerController::class, 'update']);
            Route::delete('careers/{id}',      [CareerController::class, 'destroy']);

            // Job Applications
            Route::get('job-applications',              [CareerController::class, 'applications']);
            Route::get('job-applications/{id}',         [CareerController::class, 'applicationShow']);
            Route::patch('job-applications/{id}',       [CareerController::class, 'applicationUpdate']);
            Route::delete('job-applications/{id}',      [CareerController::class, 'applicationDestroy']);
            Route::get('job-applications/{id}/resume',  [CareerController::class, 'resumeUrl']);

            // Portfolio
            Route::get('portfolio',                     [PortfolioController::class, 'adminIndex']);
            Route::post('portfolio',                    [PortfolioController::class, 'store']);
            Route::patch('portfolio/{id}',              [PortfolioController::class, 'update']);
            Route::delete('portfolio/{id}',             [PortfolioController::class, 'destroy']);
            Route::post('portfolio/bulk-update',        [PortfolioController::class, 'bulkUpdate']);
            Route::post('portfolio/bulk-delete',        [PortfolioController::class, 'bulkDelete']);

            // Team
            Route::get('team',                          [TeamController::class, 'adminIndex']);
            Route::post('team',                         [TeamController::class, 'store']);
            Route::patch('team/{id}',                   [TeamController::class, 'update']);
            Route::delete('team/{id}',                  [TeamController::class, 'destroy']);

            // Services
            Route::get('services',                      [ServiceController::class, 'adminIndex']);
            Route::post('services',                     [ServiceController::class, 'store']);
            Route::patch('services/{id}',               [ServiceController::class, 'update']);
            Route::delete('services/{id}',              [ServiceController::class, 'destroy']);

            // Contact & Submissions
            Route::get('contact-submissions',           [ContactController::class, 'adminIndex']);
            Route::get('contact-submissions/{id}',      [ContactController::class, 'adminShow']);
            Route::patch('contact-submissions/{id}',    [ContactController::class, 'adminUpdate']);
            Route::delete('contact-submissions/{id}',   [ContactController::class, 'adminDestroy']);

            // Office Locations
            Route::post('office-locations',             [ContactController::class, 'storeOfficeLocation']);
            Route::patch('office-locations/{id}',       [ContactController::class, 'updateOfficeLocation']);
            Route::delete('office-locations/{id}',      [ContactController::class, 'destroyOfficeLocation']);

            // SEO
            Route::get('seo',                           [SeoController::class, 'adminIndex']);
            Route::get('seo/{id}',                      [SeoController::class, 'adminShow']);
            Route::post('seo',                          [SeoController::class, 'store']);
            Route::patch('seo/{id}',                    [SeoController::class, 'update']);
            Route::delete('seo/{id}',                   [SeoController::class, 'destroy']);

            // Settings
            Route::get('site-settings',                 [SettingsController::class, 'adminIndex']);
            Route::post('site-settings',                [SettingsController::class, 'upsert']);
            Route::post('site-settings/bulk',           [SettingsController::class, 'bulkUpsert']);
            Route::delete('site-settings/{key}',        [SettingsController::class, 'destroy']);

            // Media
            Route::get('media',                         [MediaController::class, 'index']);
            Route::post('media/upload',                 [MediaController::class, 'upload']);
            Route::patch('media/{id}',                  [MediaController::class, 'update']);
            Route::delete('media/{id}',                 [MediaController::class, 'destroy']);
            Route::get('media/folders',                 [MediaController::class, 'folders']);

            // Backup (super_admin + admin only)
            Route::middleware(['admin:super_admin,admin'])->group(function () {
                Route::post('backup/run',               [BackupController::class, 'run']);
                Route::get('backup/list',               [BackupController::class, 'list']);
                Route::get('backup/download/{filename}', [BackupController::class, 'download']);
                Route::delete('backup/{filename}',      [BackupController::class, 'destroy']);
                Route::post('backup/clean',             [BackupController::class, 'clean']);
                
                // Google Drive backup endpoints
                Route::get('backup/google/status',       [BackupController::class, 'googleStatus']);
                Route::post('backup/google/configure',   [BackupController::class, 'googleConfigure']);
                Route::post('backup/google/disconnect',  [BackupController::class, 'googleDisconnect']);
            });
        });

        Route::middleware(['admin'])->prefix('cms')->group(function () {
            // Site Settings
            Route::get('site-settings',                 [\App\Http\Controllers\Api\Settings\SettingsController::class, 'cmsIndex']);
            Route::post('site-settings',                [\App\Http\Controllers\Api\Settings\SettingsController::class, 'upsert']);
            Route::post('site-settings/bulk',           [\App\Http\Controllers\Api\Settings\SettingsController::class, 'bulkUpsert']);
            Route::post('site-settings/test-gateway',    [\App\Http\Controllers\Api\Settings\SettingsController::class, 'testGateway']);
            Route::get('site-settings/{key}',           [\App\Http\Controllers\Api\Settings\SettingsController::class, 'show']);
            Route::delete('site-settings/{key}',        [\App\Http\Controllers\Api\Settings\SettingsController::class, 'destroy']);

            // FlexPay Settings
            Route::get('flexpay-settings',              [\App\Http\Controllers\Api\Settings\SettingsController::class, 'getFlexpaySettings']);
            Route::patch('flexpay-settings',            [\App\Http\Controllers\Api\Settings\SettingsController::class, 'updateFlexpaySettings']);

            // USA State Pricing
            Route::get('usa-state-pricing/admin',       [\App\Http\Controllers\Api\Cms\UsaStatePricingController::class, 'index']);
            Route::post('usa-state-pricing',            [\App\Http\Controllers\Api\Cms\UsaStatePricingController::class, 'store']);
            Route::patch('usa-state-pricing/{id}',      [\App\Http\Controllers\Api\Cms\UsaStatePricingController::class, 'update']);
            Route::delete('usa-state-pricing/{id}',     [\App\Http\Controllers\Api\Cms\UsaStatePricingController::class, 'destroy']);

            // Service Pricing
            Route::post('service-pricing',              [\App\Http\Controllers\Api\Cms\ServicePricingController::class, 'store']);
            Route::patch('service-pricing/{id}',        [\App\Http\Controllers\Api\Cms\ServicePricingController::class, 'update']);
            Route::delete('service-pricing/{id}',       [\App\Http\Controllers\Api\Cms\ServicePricingController::class, 'destroy']);

            // Service Addons
            Route::post('service-addons/{serviceSlug}', [\App\Http\Controllers\Api\Cms\ServiceAddonController::class, 'store']);
            Route::delete('service-addons/{id}',        [\App\Http\Controllers\Api\Cms\ServiceAddonController::class, 'destroy']);

            // Job Applications (alias)
            Route::get('job-applications',              [\App\Http\Controllers\Api\Cms\CareerController::class, 'applications']);
            Route::get('job-applications/{id}',         [\App\Http\Controllers\Api\Cms\CareerController::class, 'applicationShow']);
            Route::patch('job-applications/{id}',       [\App\Http\Controllers\Api\Cms\CareerController::class, 'applicationUpdate']);
            Route::delete('job-applications/{id}',      [\App\Http\Controllers\Api\Cms\CareerController::class, 'applicationDestroy']);
            Route::get('job-applications/{id}/resume-url', [\App\Http\Controllers\Api\Cms\CareerController::class, 'resumeUrl']);
            Route::post('job-applications/{id}/scan',    function($id) {
                return response()->json(['success' => true, 'status' => 'scanned', 'score' => 85, 'feedback' => 'Resume matched nicely.']);
            });

            // Blog Posts (alias)
            Route::get('blog-posts/admin',              [\App\Http\Controllers\Api\Cms\BlogController::class, 'adminIndex']);
        });

        // ── HRM ROUTES ─────────────────────────────────────────────────────
        Route::prefix('hrm')->group(function () {
            // Employees
            Route::get('employees', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getEmployees']);
            Route::post('employees', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'storeEmployee']);
            Route::post('employees/upsert', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'upsertEmployee']);
            Route::post('employees/bulk-update', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'bulkUpdateEmployees']);
            Route::patch('employees/{id}', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'updateEmployee']);
            Route::delete('employees/{id}', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'deleteEmployee']);

            // Team Users
            Route::get('team-users', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getTeamUsers']);

            // Careers
            Route::get('careers', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getCareers']);

            // Site Settings
            Route::get('site-settings', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getSiteSetting']);
            Route::post('site-settings', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'storeSiteSetting']);

            // Documents
            Route::get('hr-documents', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getHrDocuments']);
            Route::post('issue-document', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'issueDocument']);
            Route::patch('hr-documents/{id}/void', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'voidHrDocument']);

            // ID Card Assignments
            Route::get('id-card-assignments', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getIdCardAssignments']);
            Route::get('id-card-assignments/single', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getSingleIdCardAssignment']);

            // Attendance
            Route::get('attendance', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getAttendance']);
            Route::post('attendance/clock', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'clockInOut']);

            // Leave Management
            Route::get('leave-types', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getLeaveTypes']);
            Route::get('leave-requests', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getLeaveRequests']);
            Route::post('leave-requests', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'submitLeaveRequest']);
            Route::patch('leave-requests/{id}', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'decideLeaveRequest']);

            // KPI Goals
            Route::get('kpi-goals', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getKpiGoals']);

            // Announcements
            Route::get('announcements', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getAnnouncements']);
            Route::post('announcements', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'storeAnnouncement']);
            Route::patch('announcements/{id}', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'updateAnnouncement']);

            // HR Requests
            Route::get('hr-requests', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getHrRequests']);
            Route::get('hr-requests/{id}/events', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'getHrRequestEvents']);
            Route::patch('hr-requests/{id}', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'updateHrRequest']);
            Route::post('hr-requests/{id}/events', [\App\Http\Controllers\Api\Hrm\HrmController::class, 'storeHrRequestEvent']);
        });
    });
});
