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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\SiteSetting;

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
            return $query->get()->toArray();
        });

        return response()->json($careers);
    }

    public function show(string $slug): JsonResponse
    {
        $career = Cache::remember('career_' . $slug, 3600, function () use ($slug) {
            return Career::where('slug', $slug)->where('is_active', true)->firstOrFail()->toArray();
        });
        $data = $career;
        $data['applicant_count'] = JobApplication::where('career_id', $career['id'])
            ->orWhere('career_slug', $slug)
            ->count();
        return response()->json($data);
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
            'source'          => 'career-page',
            'status'          => 'new',
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

    public function uploadResume(Request $request): JsonResponse
    {
        $key = $request->query('key');
        if (!$key) {
            return response()->json(['message' => 'Key parameter is required.'], 400);
        }

        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'No file uploaded.'], 400);
        }

        $file = $request->file('file');
        
        // Store on public disk using the exact key (path) provided
        $stored = Storage::disk('public')->put($key, file_get_contents($file));

        if (!$stored) {
            return response()->json(['message' => 'Failed to store resume.'], 500);
        }

        return response()->json([
            'key' => $key,
            'bucket' => 'job-applications',
        ]);
    }

    public function applyPublic(Request $request): JsonResponse
    {
        $data = $request->validate([
            'career_id'        => 'nullable',
            'career_slug'      => 'nullable|string|max:255',
            'career_title'     => 'nullable|string|max:255',
            'full_name'        => 'required|string|max:255',
            'email'            => 'required|email|max:255',
            'phone'            => 'nullable|string|max:50',
            'country'          => 'nullable|string|max:100',
            'current_position' => 'nullable|string|max:255',
            'experience_years' => 'nullable|integer',
            'expected_salary'  => 'nullable|string|max:255',
            'linkedin_url'     => 'nullable|string|max:500',
            'portfolio_url'    => 'nullable|string|max:500',
            'cover_letter'     => 'nullable|string|max:5000',
            'resume_url'       => 'nullable|string|max:500',
        ]);

        $resumeFilename = null;
        if (!empty($data['resume_url'])) {
            $resumeFilename = basename($data['resume_url']);
        }

        $application = JobApplication::create([
            'career_id'        => $data['career_id'] ?? null,
            'career_slug'      => $data['career_slug'] ?? null,
            'career_title'     => $data['career_title'] ?? null,
            'full_name'        => $data['full_name'],
            'email'            => $data['email'],
            'phone'            => $data['phone'] ?? null,
            'country'          => $data['country'] ?? null,
            'current_position' => $data['current_position'] ?? null,
            'experience_years' => $data['experience_years'] ?? null,
            'expected_salary'  => $data['expected_salary'] ?? null,
            'linkedin_url'     => $data['linkedin_url'] ?? null,
            'portfolio_url'    => $data['portfolio_url'] ?? null,
            'cover_letter'     => $data['cover_letter'] ?? null,
            'resume_path'      => $data['resume_url'] ?? null,
            'resume_url'       => $data['resume_url'] ?? null,
            'resume_filename'  => $resumeFilename,
            'ip_address'       => $request->ip(),
            'source'           => 'career-page',
            'status'           => 'new',
            'metadata'         => ['user_agent' => $request->userAgent()],
        ]);

        // Send mail alert to admin
        try {
            \App\Services\MailConfigurator::configure('careers');
            Mail::html("
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e1b4b;'>New Job Application Received</h2>
                    <p><strong>Name:</strong> {$application->full_name}</p>
                    <p><strong>Email:</strong> {$application->email}</p>
                    <p><strong>Role:</strong> " . ($application->career_title ?? $application->career_slug ?? 'General') . "</p>
                    <p><strong>Expected Salary:</strong> {$application->expected_salary}</p>
                    <p><strong>Experience:</strong> {$application->experience_years} years</p>
                    <p><strong>Cover Letter:</strong></p>
                    <p style='white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 6px; color: #334155;'>" . e($application->cover_letter) . "</p>
                </div>
            ", function ($message) use ($application) {
                $message->to(config('mail.from.address') ?: 'contact@dynime.com')
                    ->subject("New Job Application: {$application->full_name} - Dynime");
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to send admin career alert email: " . $e->getMessage());
        }

        // Send confirmation email to applicant
        try {
            Mail::html("
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e1b4b;'>Application Received</h2>
                    <p>Hi {$application->full_name},</p>
                    <p>Thank you for applying for the <strong>" . ($application->career_title ?? $application->career_slug ?? 'General') . "</strong> position at Dynime.</p>
                    <p>We have successfully received your application. Our hiring team will review your profile, and we will get back to you with an update soon.</p>
                    <p style='color: #64748b; font-size: 14px;'>Best regards,<br>The Dynime Team</p>
                </div>
            ", function ($message) use ($application) {
                $message->to($application->email)
                    ->subject("Job Application Received - Dynime");
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to send applicant confirmation email: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'applicationId' => $application->id,
        ], 200);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function adminIndex(): JsonResponse
    {
        return response()->json(Career::orderBy('sort_order')->orderByDesc('created_at')->get());
    }

    public function adminShow(string $id): JsonResponse
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
            'posting_channels' => 'nullable|array',
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

    public function update(Request $request, string $id): JsonResponse
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
            'posting_channels' => 'nullable|array',
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

    public function destroy(string $id): JsonResponse
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

    public function applicationShow(string $id): JsonResponse
    {
        return response()->json(JobApplication::with('career')->findOrFail($id));
    }

    public function applicationUpdate(Request $request, string $id): JsonResponse
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

    public function applicationDestroy(string $id): JsonResponse
    {
        $app = JobApplication::findOrFail($id);
        if ($app->resume_path) {
            Storage::disk('public')->delete($app->resume_path);
        }
        $app->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function resumeUrl(string $id): JsonResponse
    {
        $app = JobApplication::findOrFail($id);
        if (!$app->resume_path) {
            return response()->json(['message' => 'No resume found.'], 404);
        }
        $url = Storage::disk('public')->url($app->resume_path);
        return response()->json(['url' => $url, 'filename' => $app->resume_filename]);
    }

    public function scan(string $id): JsonResponse
    {
        try {
            $app = JobApplication::findOrFail($id);
            $career = $app->career ?: ($app->career_id ? Career::find($app->career_id) : Career::where('slug', $app->career_slug)->first());

            if (!$career) {
                return response()->json(['message' => 'Associated career not found.'], 404);
            }

            $resumeText = "";
            $resumeChars = 0;

            if ($app->resume_path) {
                $absolutePath = Storage::disk('public')->path($app->resume_path);
                if (file_exists($absolutePath)) {
                    $resumeText = $this->extractResumeText($absolutePath, $app->resume_filename ?? basename($app->resume_path));
                    $resumeChars = strlen($resumeText);
                }
            }

            // Fallback corpus
            $corpus = $this->buildCandidateCorpus($app, $resumeText);
            $keywords = $this->deriveKeywords($career);
            $matchedInfo = $this->matchKeywords($corpus, $keywords);
            $matched = $matchedInfo['matched'];
            $missing = $matchedInfo['missing'];

            $requiredYears = $this->detectRequiredYears($career);
            $baseScore = $this->computeBaseScore(count($keywords), count($matched), $resumeChars);
            $baseScore = $this->applyExperiencePenalty($baseScore, $requiredYears, $app->experience_years);

            // Call AI structured extract
            $regexLinks = $this->extractContactLinks($resumeText . "\n" . ($app->cover_letter ?? ''));
            $ai = $this->aiStructuredExtract($career, $app, $resumeText);

            // Blended score
            $score = $baseScore;
            if ($ai && isset($ai['fit_score'])) {
                $aiScore = $ai['fit_score'];
                $score = (int) round(($aiScore * 0.6) + ($baseScore * 0.4));
            }
            $score = max(0, min(100, $score));
            $level = $score >= 70 ? 'high' : ($score >= 40 ? 'medium' : 'low');

            // Merge details
            $contactLinks = $this->mergeContactLinks($app, $regexLinks, $ai);
            $summary = $this->buildSummaryText($career, $app, $matched, $keywords, $requiredYears, $resumeChars, $ai);

            // Update application fields
            $app->update([
                'ats_score' => $score,
                'ats_match_level' => $level,
                'ats_matched_keywords' => array_slice($matched, 0, 50),
                'ats_missing_keywords' => array_slice($missing, 0, 50),
                'ats_summary' => $summary,
                'ats_scanned_at' => now(),
                'ats_resume_chars' => $resumeChars,
                'ats_contact_links' => $contactLinks,
                'ats_detected_skills' => $ai && isset($ai['detected_skills']) ? array_slice($ai['detected_skills'], 0, 60) : [],
                'ats_detected_titles' => $ai && isset($ai['detected_titles']) ? array_slice($ai['detected_titles'], 0, 20) : [],
                'ats_detected_experience_years' => $ai && isset($ai['detected_experience_years']) ? $ai['detected_experience_years'] : null,
                'ats_education' => $ai && isset($ai['education']) ? substr($ai['education'], 0, 1000) : null,
                'ats_red_flags' => $ai && isset($ai['red_flags']) ? array_slice($ai['red_flags'], 0, 20) : [],
                'ats_recommendation' => $ai && isset($ai['recommendation']) ? substr($ai['recommendation'], 0, 500) : null,
                'ats_highlights' => $ai && isset($ai['highlights']) ? array_slice($ai['highlights'], 0, 20) : [],
            ]);

            return response()->json([
                'success' => true,
                'status' => 'scanned',
                'score' => $score,
                'level' => $level,
                'feedback' => $summary
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("ATS Scan failed: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['message' => 'Scan failed: ' . $e->getMessage()], 500);
        }
    }

    private function extractResumeText(string $filePath, string $originalName): string
    {
        $lower = strtolower($originalName);
        try {
            if (str_ends_with($lower, '.pdf')) {
                return $this->extractPdfText($filePath);
            }
            if (str_ends_with($lower, '.docx')) {
                return $this->extractDocxText($filePath);
            }
            if (str_ends_with($lower, '.txt') || str_ends_with($lower, '.md') || str_ends_with($lower, '.rtf')) {
                return file_get_contents($filePath);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Text extraction failed for {$originalName}: " . $e->getMessage());
        }
        return "";
    }

    private function extractPdfText(string $filePath): string
    {
        if (!file_exists($filePath)) return "";
        $content = file_get_contents($filePath);
        $text = "";
        
        $offset = 0;
        while (($start = strpos($content, "stream", $offset)) !== false) {
            $end = strpos($content, "endstream", $start);
            if ($end === false) break;
            
            $stream = substr($content, $start + 6, $end - ($start + 6));
            $stream = trim($stream);
            
            $objHeader = substr($content, max(0, $start - 200), 200);
            $data = $stream;
            
            if (strpos($objHeader, "/FlateDecode") !== false) {
                try {
                    $decompressed = @gzuncompress($data);
                    if ($decompressed === false) {
                        $decompressed = @gzuncompress(trim($data));
                    }
                    if ($decompressed !== false) {
                        $data = $decompressed;
                    }
                } catch (\Exception $e) {}
            }
            
            if (preg_match_all("/\((.*?)\)\s*[Tj]/s", $data, $matches)) {
                $text .= implode(" ", $matches[1]) . " ";
            }
            if (preg_match_all("/\[(.*?)\]\s*TJ/s", $data, $matches)) {
                foreach ($matches[1] as $match) {
                    if (preg_match_all("/\((.*?)\)/s", $match, $submatches)) {
                        $text .= implode(" ", $submatches[1]) . " ";
                    }
                }
            }
            
            $offset = $end + 9;
        }
        
        if (empty(trim($text))) {
            $text = preg_replace('/[^a-zA-Z0-9\s\.\,\@\-\:\_\/\(\)]/', '', $content);
            $text = preg_replace('/\s+/', ' ', $text);
        }
        
        $text = preg_replace_callback('/\\\\([0-7]{3})/', function($m) {
            return chr(octdec($m[1]));
        }, $text);
        
        return str_replace(['\\(', '\\)', '\\\\', '\\n', '\\r', '\\t'], ['(', ')', '\\', "\n", "\r", "\t"], $text);
    }

    private function extractDocxText(string $filePath): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            if (($index = $zip->locateName('word/document.xml')) !== false) {
                $data = $zip->getFromIndex($index);
                $zip->close();
                return strip_tags($data);
            }
            $zip->close();
        }
        return "";
    }

    private function tokenize(string $text): array
    {
        $text = strtolower($text);
        preg_match_all("/[a-z][a-z0-9+.#-]{1,40}/", $text, $matches);
        $tokens = $matches[0] ?? [];
        
        $stopwords = [
            'the','and','for','with','you','your','our','are','will','that','this','from','have','has',
            'but','not','all','any','can','into','its','out','who','why','how','what','when','where',
            'we','us','be','is','of','to','in','on','an','a','or','at','as','by','it','if','do','so',
            'their','they','them','etc','eg','ie','via','per','up','also','just','like','more','most',
            'team','role','work','working','job','jobs','position','candidate','applicant','experience',
            'year','years','skill','skills','ability','strong','good','great','excellent','plus','nice',
            'must','should','required','preferred','including','include','includes','using','use','used',
            'able','across','within','while','other','others','new','help','build','building','based',
            'company','companies','business','product','products','customer','customers','client','clients',
        ];
        
        return array_values(array_filter($tokens, function($t) use ($stopwords) {
            return strlen($t) >= 3 && !in_array($t, $stopwords);
        }));
    }

    private function deriveKeywords($career): array
    {
        if (!$career) return [];
        $out = [];
        
        $reqs = $career->requirements;
        if (is_string($reqs)) {
            $reqs = json_decode($reqs, true) ?: [$reqs];
        }
        $reqs = is_array($reqs) ? $reqs : [];

        foreach ($reqs as $r) {
            foreach ($this->tokenize((string)$r) as $t) {
                $out[$t] = true;
            }
        }
        
        foreach ($this->tokenize($career->title . " " . $career->department) as $t) {
            $out[$t] = true;
        }
        
        $plain = strip_tags($career->content_html ?? '');
        $freq = [];
        foreach ($this->tokenize($plain) as $t) {
            $freq[$t] = ($freq[$t] ?? 0) + 1;
        }
        foreach ($freq as $t => $c) {
            if ($c >= 2) {
                $out[$t] = true;
            }
        }
        
        return array_slice(array_keys($out), 0, 80);
    }

    private function matchKeywords(string $corpus, array $keywords): array
    {
        $tokens = array_flip($this->tokenize($corpus));
        $matched = [];
        $missing = [];
        foreach ($keywords as $k) {
            if (isset($tokens[$k]) || strpos($corpus, $k) !== false) {
                $matched[] = $k;
            } else {
                $missing[] = $k;
            }
        }
        return ['matched' => $matched, 'missing' => $missing];
    }

    private function buildCandidateCorpus($app, string $resumeText): string
    {
        return strtolower(implode("\n", array_filter([
            $app->full_name,
            $app->email,
            $app->phone,
            $app->country,
            $app->current_position,
            $app->expected_salary !== null ? (string)$app->expected_salary : '',
            $app->experience_years !== null ? "{$app->experience_years} years experience" : '',
            $app->linkedin_url,
            $app->portfolio_url,
            $app->cover_letter,
            $resumeText
        ])));
    }

    private function computeBaseScore(int $totalCount, int $matchedCount, int $resumeChars): int
    {
        if ($totalCount > 0) {
            return (int) round(($matchedCount / $totalCount) * 100);
        }
        return $resumeChars > 200 ? 50 : 25;
    }

    private function detectRequiredYears($career): ?int
    {
        $reqs = $career->requirements;
        if (is_string($reqs)) {
            $reqs = json_decode($reqs, true) ?: [$reqs];
        }
        $reqs = is_array($reqs) ? $reqs : [];
        $reqText = implode(" ", $reqs) . " " . ($career->content_html ?? '');
        
        if (preg_match('/(\d+)\+?\s*(?:\+|to\s*\d+)?\s*year/i', $reqText, $matches)) {
            return (int)$matches[1];
        }
        return null;
    }

    private function applyExperiencePenalty(int $baseScore, ?int $requiredYears, ?int $applicantYears): int
    {
        if ($requiredYears !== null && $applicantYears !== null) {
            $gap = $requiredYears - (int)$applicantYears;
            if ($gap > 0) {
                $baseScore = max(0, $baseScore - min(30, $gap * 8));
            }
        }
        return $baseScore;
    }

    private function extractContactLinks(string $text): array
    {
        $text = strtolower($text);
        preg_match_all("/[\w.+-]+@[\w-]+\.[\w.-]+/", $text, $emails);
        preg_match_all("/(\+?\d[\d\s().-]{7,}\d)/", $text, $phones);
        preg_match_all("/https?:\/\/[^\s)<>'\"\u{0080}-\u{FFFF}]+/", $text, $urls);
        
        $urls = $urls[0] ?? [];
        $linkedIn = array_filter($urls, fn($u) => strpos($u, 'linkedin.com') !== false);
        $github = array_filter($urls, fn($u) => strpos($u, 'github.com') !== false);
        $twitter = array_filter($urls, fn($u) => strpos($u, 'twitter.com') !== false || strpos($u, 'x.com') !== false);
        $dribbble = array_filter($urls, fn($u) => strpos($u, 'dribbble.com') !== false || strpos($u, 'behance.net') !== false);
        
        $portfolio = array_diff($urls, $linkedIn, $github, $twitter, $dribbble);
        
        $clean = fn($arr) => array_slice(array_values(array_unique(array_filter($arr))), 0, 10);
        
        return [
            'emails' => $clean($emails[0] ?? []),
            'phones' => $clean(array_map(fn($p) => preg_replace('/\s+/', ' ', trim($p)), $phones[0] ?? [])),
            'linkedIn' => $clean($linkedIn),
            'github' => $clean($github),
            'twitter' => $clean($twitter),
            'dribbble' => $clean($dribbble),
            'portfolio' => $clean($portfolio)
        ];
    }

    private function mergeContactLinks($app, array $regex, ?array $ai): array
    {
        $aiLinks = $ai['contact_links'] ?? [];
        $dedup = function(array $arr) {
            return array_slice(array_values(array_unique(array_filter($arr))), 0, 10);
        };
        
        return [
            'emails' => $dedup(array_merge(
                $aiLinks['emails'] ?? [],
                $regex['emails'] ?? [],
                $app->email ? [strtolower($app->email)] : []
            )),
            'phones' => $dedup(array_merge(
                $aiLinks['phones'] ?? [],
                $regex['phones'] ?? [],
                $app->phone ? [$app->phone] : []
            )),
            'linkedin' => $dedup(array_merge(
                $aiLinks['linkedin'] ?? [],
                $regex['linkedIn'] ?? [],
                $app->linkedin_url ? [$app->linkedin_url] : []
            )),
            'github' => $dedup(array_merge(
                $aiLinks['github'] ?? [],
                $regex['github'] ?? []
            )),
            'portfolio' => $dedup(array_merge(
                $aiLinks['portfolio'] ?? [],
                $regex['portfolio'] ?? [],
                $app->portfolio_url ? [$app->portfolio_url] : []
            )),
            'other' => $dedup(array_merge(
                $aiLinks['other'] ?? [],
                $regex['twitter'] ?? [],
                $regex['dribbble'] ?? []
            )),
        ];
    }

    private function buildSummaryText($career, $app, array $matched, array $keywords, ?int $requiredYears, int $resumeChars, ?array $ai): string
    {
        $text = "Matched " . count($matched) . "/" . count($keywords) . " keywords for \"" . $career->title . "\".";
        if ($requiredYears !== null && $app->experience_years !== null) {
            $text .= " Required ~{$requiredYears}y, candidate has {$app->experience_years}y.";
        }
        if ($ai && isset($ai['recommendation'])) {
            $text .= " " . $ai['recommendation'];
        }
        if ($resumeChars === 0 && $app->resume_path) {
            $text .= " Resume could not be parsed.";
        }
        if (!$app->resume_path) {
            $text .= " No resume uploaded.";
        }
        return $text;
    }

    private function aiStructuredExtract($career, $app, string $resumeText): ?array
    {
        $apiKey = null;
        try {
            $apiKey = SiteSetting::get('lovable_api_key') ?: SiteSetting::get('gemini_api_key') ?: env('LOVABLE_API_KEY') ?: env('GEMINI_API_KEY');
            if (is_array($apiKey)) {
                $apiKey = $apiKey['key'] ?? array_values($apiKey)[0] ?? null;
            }
        } catch (\Exception $e) {}

        if (!$apiKey) {
            return null;
        }

        $systemPrompt = "You are an expert ATS (Applicant Tracking System) analyst. Parse the candidate's full submission and return strict JSON only. Be objective, concise, and grounded in evidence from the materials.";
        
        $reqs = $career->requirements;
        if (is_string($reqs)) {
            $reqs = json_decode($reqs, true) ?: [$reqs];
        }
        $reqs = is_array($reqs) ? $reqs : [];

        $careerSummary = [
            'title' => $career->title,
            'department' => $career->department,
            'requirements' => array_slice($reqs, 0, 30),
            'description' => substr(strip_tags($career->content_html ?? ''), 0, 4000),
        ];

        $appSummary = [
            'full_name' => $app->full_name,
            'email' => $app->email,
            'phone' => $app->phone,
            'country' => $app->country,
            'current_position' => $app->current_position,
            'experience_years' => $app->experience_years,
            'expected_salary' => $app->expected_salary,
            'linkedin_url' => $app->linkedin_url,
            'portfolio_url' => $app->portfolio_url,
            'cover_letter' => substr($app->cover_letter ?? '', 0, 4000),
        ];

        $prompt = "JOB POST:\n" . json_encode($careerSummary, JSON_PRETTY_PRINT) . "\n\n" .
                  "APPLICANT SUBMISSION (form fields):\n" . json_encode($appSummary, JSON_PRETTY_PRINT) . "\n\n" .
                  "RESUME / CV TEXT (may be empty if unparseable):\n" .
                  "\"\"\"" . substr($resumeText, 0, 14000) . "\"\"\"\n\n" .
                  "Return JSON with exactly this shape:\n" .
                  "{\n" .
                  "  \"detected_skills\": string[],\n" .
                  "  \"detected_titles\": string[],\n" .
                  "  \"detected_experience_years\": number | null,\n" .
                  "  \"education\": string,\n" .
                  "  \"contact_links\": {\n" .
                  "    \"emails\": string[], \"phones\": string[],\n" .
                  "    \"linkedin\": string[], \"github\": string[],\n" .
                  "    \"portfolio\": string[], \"other\": string[]\n" .
                  "  },\n" .
                  "  \"highlights\": string[],\n" .
                  "  \"red_flags\": string[],\n" .
                  "  \"recommendation\": string,\n" .
                  "  \"fit_score\": number\n" .
                  "}\n" .
                  "Only return JSON. No prose, no markdown.";

        try {
            if (str_starts_with($apiKey, 'AIzaSy')) {
                $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $systemPrompt . "\n\n" . $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json'
                    ]
                ]);
                
                if ($response->successful()) {
                    $json = $response->json();
                    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
                    return json_decode(trim($text), true);
                }
            } else {
                $response = Http::timeout(30)->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => "Bearer {$apiKey}",
                ])->post('https://ai.gateway.lovable.dev/v1/chat/completions', [
                    'model' => 'google/gemini-2.5-flash',
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $prompt]
                    ],
                    'response_format' => ['type' => 'json_object']
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    $content = $json['choices'][0]['message']['content'] ?? '';
                    $cleaned = trim(preg_replace('/^```json\s*/i', '', preg_replace('/```\s*$/i', '', trim($content))));
                    return json_decode($cleaned, true);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("AI structure extraction failed: " . $e->getMessage());
        }

        return null;
    }
}
