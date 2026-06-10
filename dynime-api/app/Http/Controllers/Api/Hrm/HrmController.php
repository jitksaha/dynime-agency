<?php

namespace App\Http\Controllers\Api\Hrm;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HRDocument;
use App\Models\HRRequest;
use App\Models\HRRequestEvent;
use App\Models\IdCardAssignment;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\KpiGoal;
use App\Models\Announcement;
use App\Models\AttendanceRecord;
use App\Models\User;
use App\Models\Career;
use App\Models\SiteSetting;
use App\Services\MailConfigurator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class HrmController extends Controller
{
    // ── EMPLOYEES ──────────────────────────────────────────────────────────

    public function getEmployees(Request $request): JsonResponse
    {
        $activeOnly = $request->query('active') === 'true';
        $employees = Employee::when($activeOnly, function ($q) {
            $q->where('status', 'active');
        })->orderBy('full_name')->get();

        return response()->json($employees);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $data = $request->validate([
            'full_name'           => 'required|string|max:255',
            'email'               => 'nullable|email|max:255',
            'phone'               => 'nullable|string|max:50',
            'nid_passport'        => 'nullable|string|max:255',
            'dob'                 => 'nullable|string|max:255',
            'address'             => 'nullable|string|max:255',
            'joining_date'        => 'nullable|string|max:255',
            'last_working_day'    => 'nullable|string|max:255',
            'probation_end_date'  => 'nullable|string|max:255',
            'designation'         => 'nullable|string|max:255',
            'department'          => 'nullable|string|max:255',
            'reporting_to'        => 'nullable|string|max:255',
            'employment_type'     => 'required|string|max:255',
            'job_type'            => 'nullable|string|max:255',
            'work_location'       => 'nullable|string|max:255',
            'status'              => 'required|string|max:255',
            'pay_cycle'           => 'required|string|max:255',
            'gross_salary'        => 'required|numeric',
            'currency'            => 'required|string|max:50',
            'allowances'          => 'nullable|array',
            'deductions'          => 'nullable|array',
            'bank_name'           => 'nullable|string|max:255',
            'bank_account_name'   => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_routing'        => 'nullable|string|max:255',
            'photo_url'           => 'nullable|string|max:2048',
            'employee_code'       => 'nullable|string|max:255',
            'team_member_key'     => 'nullable|string|max:255',
            'user_id'             => 'nullable|string|max:255',
            'metadata'            => 'nullable|array',
        ]);

        $data['allowances'] = $data['allowances'] ?? [];
        $data['deductions'] = $data['deductions'] ?? [];
        $data['metadata'] = $data['metadata'] ?? [];
        $data['created_by'] = $request->user()?->email ?? 'admin';

        $employee = Employee::create($data);

        return response()->json($employee, 217 ?: 201);
    }

    public function updateEmployee(Request $request, string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $data = $request->validate([
            'full_name'           => 'sometimes|required|string|max:255',
            'email'               => 'nullable|email|max:255',
            'phone'               => 'nullable|string|max:50',
            'nid_passport'        => 'nullable|string|max:255',
            'dob'                 => 'nullable|string|max:255',
            'address'             => 'nullable|string|max:255',
            'joining_date'        => 'nullable|string|max:255',
            'last_working_day'    => 'nullable|string|max:255',
            'probation_end_date'  => 'nullable|string|max:255',
            'designation'         => 'nullable|string|max:255',
            'department'          => 'nullable|string|max:255',
            'reporting_to'        => 'nullable|string|max:255',
            'employment_type'     => 'sometimes|required|string|max:255',
            'job_type'            => 'nullable|string|max:255',
            'work_location'       => 'nullable|string|max:255',
            'status'              => 'sometimes|required|string|max:255',
            'pay_cycle'           => 'sometimes|required|string|max:255',
            'gross_salary'        => 'sometimes|required|numeric',
            'currency'            => 'sometimes|required|string|max:50',
            'allowances'          => 'nullable|array',
            'deductions'          => 'nullable|array',
            'bank_name'           => 'nullable|string|max:255',
            'bank_account_name'   => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_routing'        => 'nullable|string|max:255',
            'photo_url'           => 'nullable|string|max:2048',
            'employee_code'       => 'nullable|string|max:255',
            'team_member_key'     => 'nullable|string|max:255',
            'user_id'             => 'nullable|string|max:255',
            'metadata'            => 'nullable|array',
        ]);

        $employee->update($data);

        return response()->json($employee);
    }

    public function deleteEmployee(string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $employee->delete();

        return response()->json(['success' => true]);
    }

    public function upsertEmployee(Request $request): JsonResponse
    {
        $data = $request->all();
        $conflictOn = $data['conflict_on'] ?? 'email';
        unset($data['conflict_on']);

        $queryVal = $data[$conflictOn] ?? null;
        if (!$queryVal) {
            return response()->json(['message' => "Upsert field {$conflictOn} is missing in payload."], 422);
        }

        $data['allowances'] = $data['allowances'] ?? [];
        $data['deductions'] = $data['deductions'] ?? [];
        $data['metadata'] = $data['metadata'] ?? [];
        $data['created_by'] = $request->user()?->email ?? 'admin';

        $employee = Employee::updateOrCreate(
            [$conflictOn => $queryVal],
            $data
        );

        return response()->json($employee);
    }

    public function bulkUpdateEmployees(Request $request): JsonResponse
    {
        $request->validate([
            'ids'  => 'required|array',
            'data' => 'required|array',
        ]);

        Employee::whereIn('id', $request->ids)->update($request->data);

        return response()->json(['success' => true]);
    }

    // ── TEAM USERS ─────────────────────────────────────────────────────────

    public function getTeamUsers(): JsonResponse
    {
        // Profiles (regular portal users / customers / staff)
        $profileUsers = User::all()->map(function ($u) {
            return [
                'user_id'   => (string) $u->id,
                'email'     => $u->email,
                'full_name' => $u->full_name,
                'role'      => 'authenticated',
                'source'    => 'profile',
            ];
        })->toArray();

        // Admin users (super admins, admins, managers, editors)
        $adminUsers = DB::table('admin_users')
            ->where('is_active', true)
            ->get(['id', 'email', 'name', 'role'])
            ->map(function ($u) {
                return [
                    'user_id'   => 'admin-' . $u->id,
                    'email'     => $u->email,
                    'full_name' => $u->name,
                    'role'      => $u->role,
                    'source'    => 'admin_user',
                ];
            })->toArray();

        // Merge, de-duplicate by email (profile wins over admin if same email)
        $merged = [];
        $seenEmails = [];
        foreach (array_merge($profileUsers, $adminUsers) as $user) {
            $email = strtolower(trim($user['email'] ?? ''));
            if ($email && isset($seenEmails[$email])) continue;
            if ($email) $seenEmails[$email] = true;
            $merged[] = $user;
        }

        return response()->json($merged);
    }

    // ── CAREERS ────────────────────────────────────────────────────────────

    public function getCareers(): JsonResponse
    {
        $careers = Career::select('title', 'department')->get();
        return response()->json($careers);
    }

    // ── SITE SETTINGS ──────────────────────────────────────────────────────

    public function getSiteSetting(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
        ]);

        $setting = SiteSetting::where('key', $request->key)->first();
        if (!$setting) {
            return response()->json(null);
        }

        return response()->json($setting);
    }

    public function storeSiteSetting(Request $request): JsonResponse
    {
        $request->validate([
            'key'   => 'required|string',
            'value' => 'present',
        ]);

        $setting = SiteSetting::set($request->key, $request->value, 'hrm');

        return response()->json($setting);
    }

    // ── DOCUMENT ISSUING & HISTORY ─────────────────────────────────────────

    public function getHrDocuments(): JsonResponse
    {
        $docs = HRDocument::orderBy('created_at', 'desc')->get();
        return response()->json($docs);
    }

    public function voidHrDocument(string $id): JsonResponse
    {
        $doc = HRDocument::findOrFail($id);
        $doc->update(['status' => 'voided']);

        return response()->json($doc);
    }

    public function issueDocument(Request $request): JsonResponse
    {
        // Resend mode
        if ($request->has('resend_document_id')) {
            $doc = HRDocument::findOrFail($request->resend_document_id);
            $this->sendDocumentEmail($doc);
            return response()->json([
                'success' => true,
                'message' => 'Document resent successfully.',
                'document' => $doc
            ]);
        }

        // New Document Mode
        $data = $request->validate([
            'employee_id'          => 'required|string',
            'kind'                 => 'required|string',
            'title'                => 'nullable|string',
            'doc_number'           => 'nullable|string',
            'issue_date'           => 'nullable|string',
            'effective_date'       => 'nullable|string',
            'period_month'         => 'nullable|string',
            'snapshot'             => 'nullable|array',
            'computed'             => 'nullable|array',
            'body_text'            => 'nullable|string',
            'clauses'              => 'nullable|array',
            'validity_date'        => 'nullable|string',
            'extra_earnings'       => 'nullable|array',
            'extra_deductions'     => 'nullable|array',
            'send_email'           => 'nullable|boolean',
            // Promotion
            'revised_designation'  => 'nullable|string',
            'revised_gross_salary' => 'nullable|numeric',
            // Termination
            'notice_period_days'   => 'nullable|integer',
            'severance_amount'     => 'nullable|numeric',
            'reason'               => 'nullable|string',
        ]);

        $employee = Employee::findOrFail($data['employee_id']);

        $titleMap = [
            'offer'       => 'Letter of Offer',
            'agreement'   => 'Employment Agreement',
            'payslip'     => 'Payslip',
            'experience'  => 'Experience Letter',
            'relieving'   => 'Relieving Letter',
            'promotion'   => 'Promotion Letter',
            'termination' => 'Termination Letter',
        ];
        $title = $data['title'] ?? ($titleMap[$data['kind']] ?? 'Official Document');

        // Snapshot of employee data
        $snapshot = $data['snapshot'] ?? $employee->toArray();

        // Computed values
        $computed = $data['computed'] ?? [
            'body_text'            => $data['body_text'] ?? null,
            'clauses'              => $data['clauses'] ?? null,
            'validity_date'        => $data['validity_date'] ?? null,
            'extra_earnings'       => $data['extra_earnings'] ?? null,
            'extra_deductions'     => $data['extra_deductions'] ?? null,
            'revised_designation'  => $data['revised_designation'] ?? null,
            'revised_gross_salary' => $data['revised_gross_salary'] ?? null,
            'notice_period_days'   => $data['notice_period_days'] ?? null,
            'severance_amount'     => $data['severance_amount'] ?? null,
            'reason'               => $data['reason'] ?? null,
        ];

        // Generate doc_number if not provided
        $docNumber = $data['doc_number'] ?? ('DOC-' . date('Y') . '-' . strtoupper(Str::random(6)));

        $doc = HRDocument::create([
            'employee_id'    => $data['employee_id'],
            'kind'           => $data['kind'],
            'title'          => $title,
            'doc_number'     => $docNumber,
            'issue_date'     => $data['issue_date'] ?? date('Y-m-d'),
            'effective_date' => $data['effective_date'] ?? null,
            'period_month'   => $data['period_month'] ?? null,
            'status'         => 'active',
            'snapshot'       => $snapshot,
            'computed'       => $computed,
            'sent_to_email'  => $employee->email,
            'created_by'     => $request->user()?->email ?? 'admin',
        ]);

        if (!empty($data['send_email'])) {
            $this->sendDocumentEmail($doc);
        }

        return response()->json($doc);
    }

    private function sendDocumentEmail(HRDocument $doc): void
    {
        $email = $doc->sent_to_email;
        if (empty($email)) {
            return;
        }

        // Configure using careers/HR SMTP credentials
        MailConfigurator::configure('careers');

        // Formulate a beautiful HTML content based on the kind of document
        $kindLabel = str_replace('_', ' ', $doc->kind);
        $title = $doc->title ?? ucfirst($kindLabel);

        $htmlContent = "
            <div style='font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;'>
                <div style='text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;'>
                    <h1 style='color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;'>Dynime</h1>
                    <p style='color: #64748b; margin: 4px 0 0 0; font-size: 14px;'>Human Resources Department</p>
                </div>
                
                <h2 style='color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;'>New Document Issued</h2>
                <p>Hello,</p>
                <p>A new official document <strong>\"{$title}\"</strong> has been generated and issued to you by the HR department.</p>
                
                <div style='background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 20px 0;'>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 4px 0; color: #64748b; font-size: 14px; width: 120px;'><strong>Document ID:</strong></td>
                            <td style='padding: 4px 0; color: #0f172a; font-size: 14px;'>{$doc->doc_number}</td>
                        </tr>
                        <tr>
                            <td style='padding: 4px 0; color: #64748b; font-size: 14px;'><strong>Type:</strong></td>
                            <td style='padding: 4px 0; color: #0f172a; font-size: 14px; text-transform: capitalize;'>{$kindLabel}</td>
                        </tr>
                        <tr>
                            <td style='padding: 4px 0; color: #64748b; font-size: 14px;'><strong>Issue Date:</strong></td>
                            <td style='padding: 4px 0; color: #0f172a; font-size: 14px;'>{$doc->issue_date}</td>
                        </tr>
                    </table>
                </div>

                <p>You can view, print, or download this document at any time by signing into the <strong>Dynime Employee Portal</strong> with your work email.</p>
                
                <div style='margin: 30px 0; text-align: center;'>
                    <a href='" . env('FRONTEND_URL', 'http://localhost:5173') . "/employee/login' style='background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06);'>Sign In to Employee Portal</a>
                </div>
                
                <p style='color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; text-align: center;'>
                    This is an automated notification from Dynime. Please do not reply directly to this email.
                </p>
            </div>
        ";

        try {
            Mail::html($htmlContent, function ($message) use ($email, $title) {
                $message->to($email)
                    ->subject($title . ' - Dynime');
            });
            $doc->update(['sent_at' => now()]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to email issued document ID {$doc->id}: " . $e->getMessage());
        }
    }

    // ── ID CARD ASSIGNMENTS ──────────────────────────────────────────────────

    public function getIdCardAssignments(Request $request): JsonResponse
    {
        $kind = $request->query('kind', 'EMP');
        $keys = array_filter(explode(',', $request->query('keys', '')));

        $assignments = IdCardAssignment::where('kind', $kind)
            ->when(!empty($keys), function ($q) use ($keys) {
                $q->whereIn('subject_key', $keys);
            })->get();

        return response()->json($assignments);
    }

    public function getSingleIdCardAssignment(Request $request): JsonResponse
    {
        $kind = $request->query('kind', 'EMP');
        $key = $request->query('subject_key');

        if (!$key) {
            return response()->json(['message' => 'subject_key is required'], 422);
        }

        $assignment = IdCardAssignment::where('kind', $kind)
            ->where('subject_key', $key)
            ->first();

        return response()->json($assignment);
    }

    // ── ATTENDANCE ─────────────────────────────────────────────────────────

    public function getAttendance(Request $request): JsonResponse
    {
        $employeeId = $request->query('employee_id');
        $from = $request->query('from');
        $to = $request->query('to');

        $records = AttendanceRecord::when($employeeId, function ($q) use ($employeeId) {
            $q->where('employee_id', $employeeId);
        })->when($from, function ($q) use ($from) {
            $q->where('work_date', '>=', $from);
        })->when($to, function ($q) use ($to) {
            $q->where('work_date', '<=', $to);
        })->orderBy('work_date', 'desc')->get();

        return response()->json($records);
    }

    public function clockInOut(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => 'required|string',
            'action'      => 'required|in:in,out',
        ]);

        $employee = Employee::findOrFail($request->employee_id);
        $today = Carbon::today()->toDateString();

        if ($request->action === 'in') {
            // Check if already clocked in today
            $existing = AttendanceRecord::where('employee_id', $employee->id)
                ->where('work_date', $today)
                ->first();

            if ($existing) {
                return response()->json(['message' => 'Already clocked in today.'], 400);
            }

            $record = AttendanceRecord::create([
                'employee_id'   => $employee->id,
                'work_date'     => $today,
                'clock_in'      => Carbon::now(),
                'break_minutes' => 0,
                'status'        => 'present',
                'source'        => 'web',
            ]);

            return response()->json(['message' => 'Clocked in successfully', 'record' => $record]);
        } else {
            // Clock out
            $record = AttendanceRecord::where('employee_id', $employee->id)
                ->where('work_date', $today)
                ->whereNull('clock_out')
                ->first();

            if (!$record) {
                return response()->json(['message' => 'No active clock-in found for today.'], 400);
            }

            $now = Carbon::now();
            $record->clock_out = $now;

            $diffMinutes = Carbon::parse($record->clock_in)->diffInMinutes($now);
            $record->total_minutes = max(0, $diffMinutes - $record->break_minutes);
            $record->save();

            return response()->json(['message' => 'Clocked out successfully', 'record' => $record]);
        }
    }

    // ── LEAVE MANAGEMENT ───────────────────────────────────────────────────

    public function getLeaveTypes(): JsonResponse
    {
        $types = LeaveType::where('is_active', true)->orderBy('name')->get();
        return response()->json($types);
    }

    public function getLeaveRequests(Request $request): JsonResponse
    {
        $employeeId = $request->query('employee_id');

        $requests = LeaveRequest::with(['employee', 'leaveType'])
            ->when($employeeId, function ($q) use ($employeeId) {
                $q->where('employee_id', $employeeId);
            })->orderBy('created_at', 'desc')->get();

        return response()->json($requests);
    }

    public function submitLeaveRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'   => 'required|string',
            'leave_type_id' => 'required|string',
            'from_date'     => 'required|string',
            'to_date'       => 'required|string',
            'days'          => 'required|integer|min:1',
            'half_day'      => 'required|boolean',
            'reason'        => 'nullable|string',
        ]);

        $data['status'] = 'pending';
        $data['created_by'] = $request->user()?->email ?? 'employee';

        $leave = LeaveRequest::create($data);

        return response()->json($leave, 201);
    }

    public function decideLeaveRequest(Request $request, string $id): JsonResponse
    {
        $leave = LeaveRequest::findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:approved,rejected',
            'note'   => 'nullable|string',
        ]);

        $leave->update([
            'status'        => $data['status'],
            'decision_note' => $data['note'] ?? null,
            'decided_by'    => $request->user()?->email ?? 'admin',
            'decided_at'    => now(),
        ]);

        return response()->json($leave);
    }

    // ── KPI GOALS ──────────────────────────────────────────────────────────

    public function getKpiGoals(Request $request): JsonResponse
    {
        $employeeId = $request->query('employee_id');

        $goals = KpiGoal::when($employeeId, function ($q) use ($employeeId) {
            $q->where('employee_id', $employeeId);
        })->orderBy('created_at', 'desc')->get();

        return response()->json($goals);
    }

    // ── ANNOUNCEMENTS ──────────────────────────────────────────────────────

    public function getAnnouncements(): JsonResponse
    {
        $announcements = Announcement::where('is_published', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->orderBy('pinned', 'desc')
            ->orderBy('publish_at', 'desc')
            ->get();

        return response()->json($announcements);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'body'         => 'required|string',
            'body_html'    => 'nullable|string',
            'pinned'       => 'nullable|boolean',
            'audience'     => 'required|string',
            'target_role'  => 'nullable|string',
            'department'   => 'nullable|string',
            'is_published' => 'nullable|boolean',
            'publish_at'   => 'nullable|date',
            'expires_at'   => 'nullable|date',
        ]);

        $data['pinned'] = $data['pinned'] ?? false;
        $data['is_published'] = $data['is_published'] ?? true;
        $data['publish_at'] = $data['publish_at'] ?? now();
        $data['author_id'] = $request->user()?->id;

        $announcement = Announcement::create($data);

        return response()->json($announcement, 201);
    }

    public function updateAnnouncement(Request $request, string $id): JsonResponse
    {
        $announcement = Announcement::findOrFail($id);

        $data = $request->validate([
            'title'        => 'sometimes|required|string|max:255',
            'body'         => 'sometimes|required|string',
            'body_html'    => 'nullable|string',
            'pinned'       => 'nullable|boolean',
            'audience'     => 'sometimes|required|string',
            'target_role'  => 'nullable|string',
            'department'   => 'nullable|string',
            'is_published' => 'nullable|boolean',
            'publish_at'   => 'nullable|date',
            'expires_at'   => 'nullable|date',
        ]);

        $announcement->update($data);

        return response()->json($announcement);
    }

    // ── HR REQUESTS ────────────────────────────────────────────────────────

    public function getHrRequests(Request $request): JsonResponse
    {
        $requests = HRRequest::with('employee')->orderBy('created_at', 'desc')->get();
        return response()->json($requests);
    }

    public function getHrRequestEvents(string $id): JsonResponse
    {
        $events = HRRequestEvent::where('request_id', $id)->orderBy('created_at', 'asc')->get();
        return response()->json($events);
    }

    public function updateHrRequest(Request $request, string $id): JsonResponse
    {
        $hrRequest = HRRequest::findOrFail($id);

        $data = $request->validate([
            'status'        => 'sometimes|required|string',
            'priority'      => 'sometimes|required|string',
            'decision_note' => 'nullable|string',
        ]);

        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'])) {
            $data['decided_by'] = $request->user()?->email ?? 'admin';
            $data['decided_at'] = now();
        }

        $hrRequest->update($data);

        return response()->json($hrRequest);
    }

    public function storeHrRequestEvent(Request $request, string $id): JsonResponse
    {
        $hrRequest = HRRequest::findOrFail($id);

        $data = $request->validate([
            'event_type'  => 'required|string',
            'message'     => 'nullable|string',
            'author_role' => 'required|string',
            'metadata'    => 'nullable|array',
        ]);

        $event = HRRequestEvent::create([
            'request_id'  => $id,
            'event_type'  => $data['event_type'],
            'message'     => $data['message'] ?? null,
            'author_role' => $data['author_role'],
            'author_id'   => (string) $request->user()?->id,
            'metadata'    => $data['metadata'] ?? [],
        ]);

        return response()->json($event, 201);
    }
}
