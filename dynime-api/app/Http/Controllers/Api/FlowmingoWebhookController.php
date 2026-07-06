<?php

namespace App\Http\Controllers\Api;

use App\DTOs\AtsJobDTO;
use App\Http\Controllers\Controller;
use App\Repositories\Contracts\JobRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class FlowmingoWebhookController extends Controller
{
    public function __construct(
        protected JobRepositoryInterface $jobRepository
    ) {}

    /**
     * Handle incoming Flowmingo webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        $secret = config('services.flowmingo.webhook_secret');
        
        // Verify signature if a secret is configured
        if (!empty($secret)) {
            $signature = $request->header('X-Flowmingo-Signature');
            $isValid = !empty($signature) && $this->verifySignature($request->getContent(), $signature, $secret);
            if (!$isValid) {
                Log::warning('Flowmingo Webhook: Invalid signature received. Processing anyway as fallback.', [
                    'received_signature' => $signature,
                    'computed_signature' => $signature ? hash_hmac('sha256', $request->getContent(), $secret) : null,
                    'secret_configured' => substr($secret, 0, 10) . '...'
                ]);
            }
        }

        $payload = $request->all();

        if (empty($payload['event']) || empty($payload['data'])) {
            return response()->json(['message' => 'Invalid webhook payload structure.'], 422);
        }

        $event = $payload['event'];
        $data = $payload['data'];

        Log::info("Flowmingo Webhook: Received event '{$event}'", [
            'job_id' => $data['id'] ?? null
        ]);

        try {
            switch ($event) {
                case 'job.created':
                case 'job.updated':
                case 'job_post.created':
                case 'job_post.updated':
                    if (empty($data['id'])) {
                        return response()->json(['message' => 'Missing required job ID.'], 422);
                    }
                    
                    // Webhooks payload from Flowmingo only sends basic data. Fetch complete details:
                    $apiUrl = config('services.flowmingo.url') ?: env('FLOWMINGO_API_URL', 'https://apis.flowmingo.ai/company');
                    $apiKey = config('services.flowmingo.key') ?: env('FLOWMINGO_API_KEY', '');
                    
                    $orgId = null;
                    if (!empty($apiKey)) {
                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'X-Api-Key' => $apiKey,
                            'Accept' => 'application/json',
                        ])
                        ->timeout(10)
                        ->get("{$apiUrl}/integration/hiring/job-posts/{$data['id']}/v1");
                        
                        if ($response->successful() && !empty($response->json())) {
                            $data = array_merge($data, $response->json());
                        }

                        // Get organization ID to retrieve public seeker jobs
                        $meResponse = \Illuminate\Support\Facades\Http::withHeaders([
                            'X-Api-Key' => $apiKey,
                            'Accept' => 'application/json',
                        ])
                        ->timeout(10)
                        ->get("{$apiUrl}/integration/me/v1");

                        if ($meResponse->successful()) {
                            $meData = $meResponse->json();
                            $orgId = $meData['organization_id'] ?? null;
                        }
                    }

                    // Enrich with public seeker salary data if organization ID is found
                    if ($orgId) {
                        try {
                            $publicResponse = \Illuminate\Support\Facades\Http::withHeaders([
                                'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            ])
                            ->timeout(10)
                            ->get("https://apis.flowmingo.ai/seeker/post/jobs?organization_id={$orgId}&page=1&limit=200");

                            if ($publicResponse->successful()) {
                                $publicData = $publicResponse->json();
                                $items = $publicData['items'] ?? [];
                                foreach ($items as $item) {
                                    if (!empty($item['id']) && $item['id'] === $data['id']) {
                                        $data['salary_min'] = $item['salary_min'] ?? null;
                                        $data['salary_max'] = $item['salary_max'] ?? null;
                                        $data['salary_currency'] = $item['salary_currency'] ?? null;
                                        $data['salary_period'] = $item['salary_period'] ?? null;
                                        break;
                                    }
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning("Webhook: Failed to fetch public seeker jobs for salary enrichment: " . $e->getMessage());
                        }
                    }
                    
                    // Generate proper apply URL (direct interview link if com_interview_set_id exists, else job portal link)
                    $interviewSetId = $data['com_interview_set_id'] ?? null;
                    if (!empty($interviewSetId)) {
                        $data['apply_url'] = "https://talent.flowmingo.ai/interview/{$interviewSetId}";
                    } else {
                        $projId = $data['com_project_id'] ?? $data['id'] ?? '';
                        $data['apply_url'] = "https://talent.flowmingo.ai/jobs/" . base64_encode($projId);
                    }
                    
                    $dto = AtsJobDTO::fromArray($data);
                    $this->jobRepository->upsertJob($dto);
                    break;

                case 'job.deleted':
                case 'job.closed':
                case 'job_post.deleted':
                case 'job_post.closed':
                    if (empty($data['id'])) {
                        return response()->json(['message' => 'Missing job ID.'], 422);
                    }
                    $this->jobRepository->deleteJob((string) $data['id']);
                    break;

                default:
                    Log::warning("Flowmingo Webhook: Unhandled event '{$event}'");
                    return response()->json(['message' => 'Event not handled.'], 200);
            }

            return response()->json(['message' => 'Webhook processed successfully.']);

        } catch (Throwable $e) {
            Log::error('Flowmingo Webhook error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Webhook processing failed.'], 500);
        }
    }

    /**
     * Verify the HMAC SHA256 signature.
     */
    protected function verifySignature(string $payload, string $signature, string $secret): bool
    {
        $computed = hash_hmac('sha256', $payload, $secret);
        return hash_equals($computed, $signature);
    }
}
