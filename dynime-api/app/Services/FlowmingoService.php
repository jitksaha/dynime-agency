<?php

namespace App\Services;

use App\DTOs\AtsJobDTO;
use App\Services\Contracts\AtsProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\RequestException;
use Exception;

class FlowmingoService implements AtsProviderInterface
{
    protected string $apiUrl;
    protected string $apiKey;
    protected int $timeout;
    protected int $retryAttempts;
    protected int $retryDelayMs;

    public function __construct()
    {
        $this->apiUrl = (string) config('services.flowmingo.url') ?: (string) env('FLOWMINGO_API_URL', 'https://api.flowmingo.com/v1');
        $this->apiKey = (string) config('services.flowmingo.key') ?: (string) env('FLOWMINGO_API_KEY', '');
        $this->timeout = (int) config('services.flowmingo.timeout', 10);
        $this->retryAttempts = (int) config('services.flowmingo.retries', 3);
        $this->retryDelayMs = (int) config('services.flowmingo.retry_delay', 100);
    }

    /**
     * Fetch all active jobs from Flowmingo.
     *
     * @return array<AtsJobDTO>
     * @throws Exception
     */
    public function fetchJobs(): array
    {
        if (empty($this->apiKey)) {
            Log::error('Flowmingo API integration error: API Key is not configured.');
            throw new Exception('Flowmingo API key not configured.');
        }

        try {
            // Build request with headers, timeout, and retries
            $response = Http::withHeaders([
                'X-Api-Key' => $this->apiKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeout)
            ->retry($this->retryAttempts, $this->retryDelayMs)
            ->get("{$this->apiUrl}/jobs");

            if ($response->failed()) {
                Log::error('Flowmingo API returned error status', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                $response->throw();
            }

            $body = $response->json();

            // Validate that we got a list/array back
            if (!is_array($body) || !isset($body['data']) || !is_array($body['data'])) {
                Log::error('Flowmingo API response validation failed: expected data array in response body', [
                    'body' => $body
                ]);
                throw new Exception('Invalid response structure from Flowmingo API.');
            }

            $jobs = [];
            foreach ($body['data'] as $jobData) {
                // Validate required fields in the job payload
                if (!isset($jobData['id']) || !isset($jobData['title']) || !isset($jobData['apply_url'])) {
                    Log::warning('Flowmingo API: Skipping job because it lacks required fields', [
                        'job_data' => $jobData
                    ]);
                    continue;
                }

                $jobs[] = AtsJobDTO::fromArray($jobData);
            }

            return $jobs;

        } catch (RequestException $e) {
            Log::error('Flowmingo API request failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw new Exception('Flowmingo API request failed: ' . $e->getMessage(), 0, $e);
        } catch (Exception $e) {
            Log::error('Flowmingo Service error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
