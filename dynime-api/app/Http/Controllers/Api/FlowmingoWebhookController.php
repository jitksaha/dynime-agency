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
                Log::warning('Flowmingo Webhook: Invalid signature received.', [
                    'received_signature' => $signature,
                    'computed_signature' => $signature ? hash_hmac('sha256', $request->getContent(), $secret) : null,
                    'secret_configured' => substr($secret, 0, 10) . '...'
                ]);
                return response()->json(['message' => 'Invalid signature.'], 401);
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
                    if (empty($data['id'])) {
                        return response()->json(['message' => 'Missing required job ID.'], 422);
                    }
                    
                    // Webhooks payload from Flowmingo only sends basic data. Fetch complete details:
                    $apiUrl = config('services.flowmingo.url') ?: env('FLOWMINGO_API_URL', 'https://apis.flowmingo.ai/company');
                    $apiKey = config('services.flowmingo.key') ?: env('FLOWMINGO_API_KEY', '');
                    
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
                    }
                    
                    $dto = AtsJobDTO::fromArray($data);
                    $this->jobRepository->upsertJob($dto);
                    break;

                case 'job.deleted':
                case 'job.closed':
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
