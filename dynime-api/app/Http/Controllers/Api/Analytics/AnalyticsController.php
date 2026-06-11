<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Career;
use App\Models\ContactSubmission;
use App\Models\JobApplication;
use App\Models\PageAnalytic;
use App\Models\PortfolioProject;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function trackPageView(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path'        => 'required|string|max:500',
            'entity_type' => 'nullable|string|max:100',
            'entity_id'   => 'nullable|integer',
            'referer'     => 'nullable|string|max:500',
        ]);

        DB::table('page_analytics')->insert([
            'path'        => $data['path'],
            'entity_type' => $data['entity_type'] ?? null,
            'entity_id'   => $data['entity_id'] ?? null,
            'user_agent'  => substr($request->userAgent() ?? '', 0, 500),
            'ip_address'  => $request->ip(),
            'referer'     => $data['referer'] ?? null,
            'created_at'  => now(),
        ]);

        return response()->json(['recorded' => true]);
    }

    public function dashboard(): JsonResponse
    {
        $now      = now();
        $lastMonth = $now->copy()->subMonth();
        $last7d   = $now->copy()->subDays(7);
        $last30d  = $now->copy()->subDays(30);

        return response()->json([
            'counts' => [
                'blog_posts'           => BlogPost::where('is_published', true)->count(),
                'careers_active'       => Career::where('is_active', true)->count(),
                'portfolio_projects'   => PortfolioProject::where('is_published', true)->count(),
                'services'             => Service::where('is_active', true)->count(),
                'contact_new'          => ContactSubmission::where('status', 'new')->count(),
                'job_applications_new' => JobApplication::where('status', 'new')->count(),
            ],
            'pageviews' => [
                'last_7_days'  => DB::table('page_analytics')->where('created_at', '>=', $last7d)->count(),
                'last_30_days' => DB::table('page_analytics')->where('created_at', '>=', $last30d)->count(),
                'total'        => DB::table('page_analytics')->count(),
            ],
            'top_pages' => DB::table('page_analytics')
                ->select('path', DB::raw('COUNT(*) as views'))
                ->where('created_at', '>=', $last30d)
                ->groupBy('path')
                ->orderByDesc('views')
                ->limit(10)
                ->get(),
            'top_blog_posts' => BlogPost::published()
                ->orderByDesc('view_count')
                ->limit(5)
                ->select('id', 'title', 'slug', 'view_count', 'published_at')
                ->get(),
            'top_careers' => Career::active()
                ->orderByDesc('view_count')
                ->limit(5)
                ->select('id', 'title', 'slug', 'view_count')
                ->get(),
            'recent_contacts' => ContactSubmission::latest()
                ->limit(5)
                ->select('id', 'name', 'email', 'subject', 'status', 'created_at')
                ->get(),
            'recent_applications' => JobApplication::latest()
                ->limit(5)
                ->select('id', 'full_name', 'email', 'career_slug', 'status', 'created_at')
                ->get(),
        ]);
    }

    public function pageviews(Request $request): JsonResponse
    {
        $days = min((int) $request->input('days', 30), 90);
        $from = now()->subDays($days);

        $data = DB::table('page_analytics')
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as views'))
            ->where('created_at', '>=', $from)
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($data);
    }

    public function orders(): JsonResponse
    {
        $orders = DB::table('orders')
            ->select([
                'id', 'total', 'status',
                'customer_name', 'customer_email', 'created_at',
                'tax_amount', 'tax_percent', 'tax_mode', 'tax_label',
                'refunded_amount', 'refunded_tax_amount', 'refunded_at'
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($orders);
    }

    public function subscribers(): JsonResponse
    {
        $subs = DB::table('newsletter_subscribers')
            ->select(['id', 'email', 'status', 'created_at'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json($subs);
    }

    public function fxOrders(): JsonResponse
    {
        $fx = DB::table('fx_orders')
            ->select([
                'status', 'base_currency', 'base_amount',
                'revenue_usd', 'cost_usd', 'profit_usd',
                'fee_usd', 'order_date'
            ])
            ->orderByDesc('order_date')
            ->limit(2000)
            ->get();

        return response()->json($fx);
    }

    public function employees(): JsonResponse
    {
        $employees = DB::table('dynime_employees')
            ->select([
                'employee_id', 'full_name', 'department', 'designation', 'status',
                'monthly_gross_usd', 'annual_salary_usd'
            ])
            ->get();

        return response()->json($employees);
    }

    public function kpi(): JsonResponse
    {
        $kpi = DB::table('dynime_kpi_monthly')
            ->select([
                'period', 'revenue_usd', 'net_income_usd', 'mrr_usd',
                'headcount', 'churn_rate_pct', 'nps_score'
            ])
            ->orderBy('period')
            ->get();

        return response()->json($kpi);
    }

    public function counts(): JsonResponse
    {
        $portfolio = DB::table('portfolio_projects')->count();
        return response()->json(['portfolio' => $portfolio]);
    }
}

