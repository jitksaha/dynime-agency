<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\Career;
use App\Models\JobApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CareerController extends Controller
{
    // ── Public ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'careers_' . md5($request->department ?? 'all');

        $careers = Cache::remember($cacheKey, 3600, function () use ($request) {
            $query = Career::active()->select([
                'id', 'slug', 'title', 'department', 'location', 'employment_type',
                'experience_level', 'salary_range', 'is_featured', 'vacancies',
                'hero_image_url', 'view_count', 'posted_at',
            ]);
            if ($request->department) {
                $query->where('department', $request->department);
            }
            return $query->get();
        });

        return response()->json($careers);
    }

    public function show(string $slug): JsonResponse
    {
        $career = Cache::remember('career_' . $slug, 3600, function () use ($slug) {
            return Career::where('slug', $slug)->where('is_active', true)->firstOrFail();
        });
        return response()->json($career);
    }

    public function recordView(string $slug): JsonResponse
    {
        $career = Career::where('slug', $slug)->firstOrFail();
        $career->incrementView();
        Cache::forget('career_' . $slug);
        return response()->json(['view_count' => $career->view_count]);
    }

    public function departments(): JsonResponse
    {
        $depts = Cache::remember('career_departments', 3600, fn() =>
            Career::active()->distinct()->orderBy('department')->pluck('department')
        );
        return response()->json($depts);
    }

    // ── Job Applications (Public) ────────────────────────────────────────────

    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'career_id'    => 'nullable|exists:careers,id',
            'career_slug'  => 'nullable|string|max:255',
            'full_name'    => 'required|string|max:255',
            'email'        => 'required|email|max:255',
            'phone'        => 'nullable|string|max:50',
            'cover_letter' => 'nullable|string|max:5000',
            'resume'       => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $resume = $request->file('resume');
        $filename = Str::uuid() . '.' . $resume->extension();
        $path = $resume->storeAs('resumes', $filename, 'public');

        $application = JobApplication::create([
            'career_id'       => $data['career_id'] ?? null,
            'career_slug'     => $data['career_slug'] ?? null,
            'full_name'       => $data['full_name'],
            'email'           => $data['email'],
            'phone'           => $data['phone'] ?? null,
            'cover_letter'    => $data['cover_letter'] ?? null,
            'resume_path'     => $path,
            'resume_filename' => $resume->getClientOriginalName(),
            'ip_address'      => $request->ip(),
            'metadata'        => ['user_agent' => $request->userAgent()],
        ]);

        // Notify admin
        try {
            \App\Services\MailConfigurator::configure('careers');
            Mail::raw(
                "New job application from {$data['full_name']} ({$data['email']}) for: {$data['career_slug']}",
                fn($m) => $m->to(config('mail.from.address'))->subject('New Job Application - Dynime')
            );
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Application submitted successfully. We will contact you soon.',
            'id'      => $application->id,
        ], 201);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function adminIndex(): JsonResponse
    {
        return response()->json(Career::orderBy('sort_order')->orderByDesc('created_at')->get());
    }

    public function adminShow(int $id): JsonResponse
    {
        return response()->json(Career::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'            => 'required|string|max:500',
            'slug'             => 'nullable|string|max:255',
            'department'       => 'nullable|string|max:100',
            'location'         => 'nullable|string|max:255',
            'employment_type'  => 'nullable|string|max:100',
            'experience_level' => 'nullable|string|max:100',
            'salary_range'     => 'nullable|string|max:100',
            'description'      => 'nullable|string',
            'content_html'     => 'nullable|string',
            'responsibilities' => 'nullable|array',
            'requirements'     => 'nullable|array',
            'hero_image_url'   => 'nullable|url|max:500',
            'vacancies'        => 'nullable|integer|min:1',
            'is_active'        => 'nullable|boolean',
            'is_featured'      => 'nullable|boolean',
            'sort_order'       => 'nullable|integer',
            'meta_title'       => 'nullable|string|max:255',
            'meta_desc'        => 'nullable|string',
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);
        $career = Career::create($data);
        Cache::flush();

        return response()->json($career, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $career = Career::findOrFail($id);
        $data = $request->validate([
            'title'            => 'sometimes|string|max:500',
            'slug'             => 'sometimes|string|max:255',
            'department'       => 'nullable|string|max:100',
            'location'         => 'nullable|string|max:255',
            'employment_type'  => 'nullable|string|max:100',
            'experience_level' => 'nullable|string|max:100',
            'salary_range'     => 'nullable|string|max:100',
            'description'      => 'nullable|string',
            'content_html'     => 'nullable|string',
            'responsibilities' => 'nullable|array',
            'requirements'     => 'nullable|array',
            'hero_image_url'   => 'nullable|url|max:500',
            'vacancies'        => 'nullable|integer|min:1',
            'is_active'        => 'nullable|boolean',
            'is_featured'      => 'nullable|boolean',
            'sort_order'       => 'nullable|integer',
            'meta_title'       => 'nullable|string|max:255',
            'meta_desc'        => 'nullable|string',
        ]);
        $career->update($data);
        Cache::flush();
        return response()->json($career);
    }

    public function destroy(int $id): JsonResponse
    {
        Career::findOrFail($id)->delete();
        Cache::flush();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    // ── Admin: Applications ──────────────────────────────────────────────────

    public function applications(Request $request): JsonResponse
    {
        $apps = JobApplication::with('career:id,title,slug')
            ->orderByDesc('created_at')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->career_id, fn($q) => $q->where('career_id', $request->career_id))
            ->get();
        return response()->json($apps);
    }

    public function applicationShow(int $id): JsonResponse
    {
        return response()->json(JobApplication::with('career')->findOrFail($id));
    }

    public function applicationUpdate(Request $request, int $id): JsonResponse
    {
        $app = JobApplication::findOrFail($id);
        $oldStatus = $app->status;

        $data = $request->validate([
            'status'      => 'sometimes|in:new,reviewing,shortlisted,rejected,hired',
            'admin_notes' => 'nullable|string',
        ]);

        $app->update($data);

        // If status changed, send email notification
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $this->sendApplicationStatusEmail($app->email, $app->full_name, $app->career_slug ?? 'General', $data['status']);
        }

        return response()->json($app);
    }

    private function sendApplicationStatusEmail(string $email, string $name, string $jobTitle, string $status): void
    {
        $statusLabel = ucfirst($status);
        if ($status === 'reviewing') {
            $statusLabel = 'Under Review';
        }

        $subject = "Application Status Update: {$statusLabel} - Dynime";

        $statusMessages = [
            'reviewing' => "Your application is currently being reviewed by our hiring team. We will update you as soon as there is a decision.",
            'shortlisted' => "Congratulations! You have been shortlisted for the next round of our hiring process. Our team will contact you shortly to schedule an interview.",
            'rejected' => "Thank you for your interest in joining Dynime. Unfortunately, we have decided to move forward with other candidates whose profiles align more closely with our requirements. We wish you the best in your future endeavors.",
            'hired' => "Congratulations! We are thrilled to offer you a position at Dynime. Our HR team will reach out to you with details regarding the offer letter and onboarding instructions.",
        ];

        $messageBody = $statusMessages[$status] ?? "Your application status has been updated to: {$statusLabel}.";

        try {
            \App\Services\MailConfigurator::configure('careers');
            Mail::html("
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e1b4b;'>Application Status Update</h2>
                    <p>Hi {$name},</p>
                    <p>Thank you for applying for the <strong>{$jobTitle}</strong> position at Dynime.</p>
                    <p>{$messageBody}</p>
                    <p style='color: #64748b; font-size: 14px;'>Best regards,<br>The Dynime Team</p>
                </div>
            ", function ($message) use ($email, $subject) {
                $message->to($email)
                    ->subject($subject);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to send job application status update email: " . $e->getMessage());
        }
    }

    public function applicationDestroy(int $id): JsonResponse
    {
        $app = JobApplication::findOrFail($id);
        if ($app->resume_path) {
            Storage::disk('public')->delete($app->resume_path);
        }
        $app->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function resumeUrl(int $id): JsonResponse
    {
        $app = JobApplication::findOrFail($id);
        if (!$app->resume_path) {
            return response()->json(['message' => 'No resume found.'], 404);
        }
        $url = Storage::disk('public')->url($app->resume_path);
        return response()->json(['url' => $url, 'filename' => $app->resume_filename]);
    }
}
