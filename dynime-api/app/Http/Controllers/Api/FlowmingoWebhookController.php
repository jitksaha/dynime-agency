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
        $secret = env('FLOWMINGO_WEBHOOK_SECRET');
        
        // Verify signature if a secret is configured
        if (!empty($secret)) {
            $signature = $request->header('X-Flowmingo-Signature');
            if (empty($signature) || !$this->verifySignature($request->getContent(), $signature, $secret)) {
                Log::warning('Flowmingo Webhook: Invalid signature received.');
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
                    if (empty($data['id']) || empty($data['title']) || empty($data['apply_url'])) {
                        return response()->json(['message' => 'Missing required job data fields.'], 422);
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
