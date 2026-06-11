<?php

namespace App\Http\Controllers\Api\Hrm;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollController extends Controller
{
    // ── READS ──────────────────────────────────────────────────────────────

    public function getRuns(): JsonResponse
    {
        $runs = DB::table('payroll_runs')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->limit(200)
            ->get()
            ->map(function ($run) {
                if (isset($run->totals) && is_string($run->totals)) {
                    $run->totals = json_decode($run->totals, true);
                }
                return $run;
            });

        return response()->json($runs);
    }

    public function getItems(string $runId): JsonResponse
    {
        $items = DB::table('payroll_items')
            ->where('run_id', $runId)
            ->orderBy('employee_name')
            ->get()
            ->map(function ($item) {
                if (isset($item->breakdown) && is_string($item->breakdown)) {
                    $item->breakdown = json_decode($item->breakdown, true);
                }
                return $item;
            });

        return response()->json($items);
    }

    public function getAdjustments(string $itemId): JsonResponse
    {
        $adjustments = DB::table('payroll_adjustments')
            ->where('item_id', $itemId)
            ->orderBy('created_at')
            ->get();

        return response()->json($adjustments);
    }

    public function getAudit(string $runId): JsonResponse
    {
        $audit = DB::table('payroll_audit_logs')
            ->where('run_id', $runId)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json($audit);
    }

    public function getActiveEmployeeCount(): JsonResponse
    {
        $count = DB::table('employees')
            ->where('status', 'active')
            ->count();

        return response()->json($count);
    }

    // ── WRITES & ACTIONS ───────────────────────────────────────────────────

    public function ensureCurrentMonth(Request $request): JsonResponse
    {
        $currency = $request->input('currency', 'USD');
        $workingDays = (int) $request->input('working_days', 22);

        $now = now();
        $year = (int) $now->format('Y');
        $month = (int) $now->format('m');

        // Check if run already exists
        $existing = DB::table('payroll_runs')
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->first();

        if ($existing) {
            return response()->json($existing->id);
        }

        // Create new draft run
        $runId = (string) Str::uuid();
        DB::table('payroll_runs')->insert([
            'id' => $runId,
            'period_year' => $year,
            'period_month' => $month,
            'currency' => $currency,
            'working_days' => $workingDays,
            'status' => 'draft',
            'locked' => 0,
            'totals' => json_encode([
                'gross_total' => 0,
                'allowances_total' => 0,
                'deductions_total' => 0,
                'net_total' => 0,
                'tax_total' => 0
            ]),
            'created_by' => $request->user()?->email ?? 'admin',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Automatically sync/generate items for this run
        $this->syncRunItems($runId, $currency, $workingDays);

        return response()->json($runId);
    }

    public function syncRun(string $id): JsonResponse
    {
        $run = DB::table('payroll_runs')->where('id', $id)->first();
        if (!$run) {
            return response()->json(['message' => 'Run not found'], 404);
        }

        $count = $this->syncRunItems($run->id, $run->currency, $run->working_days);
        return response()->json($count);
    }

    public function generateRun(Request $request): JsonResponse
    {
        $currency = $request->input('currency', 'USD');
        $workingDays = (int) $request->input('working_days', 22);
        $year = (int) $request->input('periodYear');
        $month = (int) $request->input('periodMonth');

        // Check if run already exists
        $existing = DB::table('payroll_runs')
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->first();

        if ($existing) {
            return response()->json($existing->id);
        }

        $runId = (string) Str::uuid();
        DB::table('payroll_runs')->insert([
            'id' => $runId,
            'period_year' => $year,
            'period_month' => $month,
            'currency' => $currency,
            'working_days' => $workingDays,
            'status' => 'draft',
            'locked' => 0,
            'totals' => json_encode([
                'gross_total' => 0,
                'allowances_total' => 0,
                'deductions_total' => 0,
                'net_total' => 0,
                'tax_total' => 0
            ]),
            'created_by' => $request->user()?->email ?? 'admin',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $this->syncRunItems($runId, $currency, $workingDays);

        return response()->json($runId);
    }

    public function approveRun(string $id): JsonResponse
    {
        DB::table('payroll_runs')->where('id', $id)->update([
            'status' => 'approved',
            'approved_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['success' => true]);
    }

    public function markPaid(Request $request, string $id): JsonResponse
    {
        $itemIds = $request->input('item_ids');
        $method = $request->input('method', 'bank');

        if (is_array($itemIds) && count($itemIds) > 0) {
            DB::table('payroll_items')
                ->where('run_id', $id)
                ->whereIn('id', $itemIds)
                ->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'payment_method' => $method,
                    'updated_at' => now()
                ]);
        } else {
            DB::table('payroll_runs')->where('id', $id)->update([
                'status' => 'paid',
                'paid_at' => now(),
                'updated_at' => now()
            ]);

            DB::table('payroll_items')
                ->where('run_id', $id)
                ->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'payment_method' => $method,
                    'updated_at' => now()
                ]);
        }

        return response()->json(['success' => true]);
    }

    public function cancelItem(Request $request, string $id): JsonResponse
    {
        $reason = $request->input('reason', 'Cancelled by admin');

        DB::table('payroll_items')->where('id', $id)->update([
            'status' => 'cancelled',
            'notes' => $reason,
            'updated_at' => now()
        ]);

        return response()->json(['success' => true]);
    }

    public function lockRun(Request $request, string $id): JsonResponse
    {
        $lock = $request->input('lock') ? 1 : 0;

        DB::table('payroll_runs')->where('id', $id)->update([
            'locked' => $lock,
            'updated_at' => now()
        ]);

        return response()->json(['success' => true]);
    }

    public function seedHistory(): JsonResponse
    {
        // History is already seeded via the database export/migration from Supabase
        return response()->json(['success' => true, 'message' => 'History already seeded and up-to-date!']);
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────

    private function syncRunItems(string $runId, string $currency, int $workingDays): int
    {
        $employees = DB::table('employees')->where('status', 'active')->get();
        $count = 0;

        foreach ($employees as $emp) {
            $exists = DB::table('payroll_items')
                ->where('run_id', $runId)
                ->where('employee_id', $emp->id)
                ->exists();

            if (!$exists) {
                $itemId = (string) Str::uuid();
                $baseSalary = (double) ($emp->gross_salary ?? 0);

                // Simple net pay calculation (base salary + allowances - deductions)
                $allowances = json_decode($emp->allowances ?? '[]', true) ?: [];
                $deductions = json_decode($emp->deductions ?? '[]', true) ?: [];

                $allowSum = array_reduce($allowances, function ($carry, $item) {
                    return $carry + (double) ($item['amount'] ?? 0);
                }, 0.0);

                $deductSum = array_reduce($deductions, function ($carry, $item) {
                    return $carry + (double) ($item['amount'] ?? 0);
                }, 0.0);

                $netPay = $baseSalary + $allowSum - $deductSum;

                DB::table('payroll_items')->insert([
                    'id' => $itemId,
                    'run_id' => $runId,
                    'employee_id' => $emp->id,
                    'employee_name' => $emp->full_name,
                    'designation' => $emp->designation,
                    'department' => $emp->department,
                    'currency' => $currency,
                    'base_salary' => $baseSalary,
                    'allowances_total' => $allowSum,
                    'deductions_total' => $deductSum,
                    'net_pay' => (int) $netPay,
                    'paid_amount' => $netPay,
                    'status' => 'draft',
                    'attendance_present' => $workingDays,
                    'attendance_absent' => 0,
                    'attendance_late' => 0,
                    'leave_paid_days' => 0,
                    'leave_unpaid_days' => 0,
                    'overtime_hours' => 0,
                    'prorate_factor' => 1.0,
                    'prorate_deduction' => 0.0,
                    'tax' => 0,
                    'taxable_income' => (int) $netPay,
                    'breakdown' => json_encode([
                        'base' => $baseSalary,
                        'allowances' => $allowances,
                        'deductions' => $deductions,
                        'gross' => $baseSalary + $allowSum,
                        'net' => $netPay
                    ]),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                $count++;
            }
        }

        // Recalculate totals for the run
        $items = DB::table('payroll_items')->where('run_id', $runId)->get();
        $grossTotal = 0;
        $allowTotal = 0;
        $deductTotal = 0;
        $netTotal = 0;

        foreach ($items as $item) {
            $grossTotal += (double) $item->base_salary;
            $allowTotal += (double) $item->allowances_total;
            $deductTotal += (double) $item->deductions_total;
            $netTotal += (double) $item->net_pay;
        }

        DB::table('payroll_runs')->where('id', $runId)->update([
            'totals' => json_encode([
                'gross_total' => $grossTotal,
                'allowances_total' => $allowTotal,
                'deductions_total' => $deductTotal,
                'net_total' => $netTotal,
                'tax_total' => 0
            ]),
            'updated_at' => now()
        ]);

        return $count;
    }
}
