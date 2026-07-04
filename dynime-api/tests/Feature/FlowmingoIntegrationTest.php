<?php

namespace Tests\Feature;

use App\DTOs\AtsJobDTO;
use App\Jobs\SyncJobsJob;
use App\Models\Job;
use App\Repositories\Contracts\JobRepositoryInterface;
use App\Services\Contracts\AtsProviderInterface;
use App\Services\FlowmingoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FlowmingoIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        Cache::flush();

        config(['services.flowmingo.key' => 'test-key']);
        config(['services.flowmingo.url' => 'https://api.flowmingo.com/v1']);
    }

    /**
     * Test the FlowmingoService fetches jobs correctly and maps to AtsJobDTO.
     */
    public function test_flowmingo_service_fetches_and_parses_jobs(): void
    {
        Http::fake([
            'https://api.flowmingo.com/v1/integration/me/v1' => Http::response([
                'organization_id' => 21234
            ], 200),
            'https://api.flowmingo.com/v1/integration/hiring/job-posts/v1' => Http::response([
                'data' => [
                    [
                        'id' => 'fl_123',
                        'title' => 'Senior Backend Engineer',
                        'status' => 1,
                        'created_at' => '2026-07-04T12:00:00Z',
                    ]
                ]
            ], 200),
            'https://api.flowmingo.com/v1/integration/hiring/interview-sets/v1' => Http::response([
                'data' => [
                    [
                        'id' => 'set_123',
                        'title' => 'Senior Backend Engineer Interview Set',
                        'status' => 1,
                        'set_type' => 1,
                        'created_at' => '2026-07-04T12:00:00Z',
                    ]
                ]
            ], 200),
        ]);

        $service = app(AtsProviderInterface::class);
        $this->assertInstanceOf(FlowmingoService::class, $service);

        $jobs = $service->fetchJobs();

        $this->assertCount(1, $jobs);
        $dto = $jobs[0];
        $this->assertInstanceOf(AtsJobDTO::class, $dto);
        $this->assertEquals('fl_123', $dto->flowmingo_job_id);
        $this->assertEquals('Senior Backend Engineer', $dto->title);
        $this->assertEquals('https://talent.flowmingo.ai/jobs/' . base64_encode('fl_123'), $dto->apply_url);
    }

    /**
     * Test repository reconciliation logic.
     */
    public function test_repository_sync_jobs_creates_updates_and_deletes(): void
    {
        // 1. Pre-seed a job that will be deleted (since it is active locally but not in ATS output)
        Job::create([
            'flowmingo_job_id' => 'fl_old',
            'title' => 'Closed Job',
            'slug' => 'closed-job',
            'department' => 'HR',
            'employment_type' => 'Full-time',
            'location' => 'Office',
            'status' => 'open',
            'apply_url' => 'https://apply.flowmingo.com/dynime/fl_old',
        ]);

        // 2. Pre-seed a job that will be updated
        Job::create([
            'flowmingo_job_id' => 'fl_update',
            'title' => 'Outdated Title',
            'slug' => 'outdated-title',
            'department' => 'Marketing',
            'employment_type' => 'Full-time',
            'location' => 'Office',
            'status' => 'open',
            'apply_url' => 'https://apply.flowmingo.com/dynime/fl_update',
        ]);

        // Define incoming ATS jobs DTOs (fl_update with new title, and a brand new fl_new)
        $dtos = [
            AtsJobDTO::fromArray([
                'id' => 'fl_update',
                'title' => 'Updated Title',
                'slug' => 'updated-title',
                'department' => 'Marketing',
                'employment_type' => 'Full-time',
                'location' => 'Office',
                'status' => 'open',
                'apply_url' => 'https://apply.flowmingo.com/dynime/fl_update',
            ]),
            AtsJobDTO::fromArray([
                'id' => 'fl_new',
                'title' => 'Brand New Job',
                'slug' => 'brand-new-job',
                'department' => 'Engineering',
                'employment_type' => 'Contract',
                'location' => 'Remote',
                'status' => 'open',
                'apply_url' => 'https://apply.flowmingo.com/dynime/fl_new',
            ])
        ];

        $repository = app(JobRepositoryInterface::class);
        $stats = $repository->syncJobs($dtos);

        // Verify return stats
        $this->assertEquals(1, $stats['created']); // fl_new
        $this->assertEquals(1, $stats['updated']); // fl_update
        $this->assertEquals(1, $stats['deleted']); // fl_old should be soft deleted

        // Verify DB state
        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_new',
            'title' => 'Brand New Job',
        ]);

        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_update',
            'title' => 'Updated Title',
        ]);

        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_old',
            'status' => 'closed',
        ]);
        $this->assertSoftDeleted('ats_jobs', ['flowmingo_job_id' => 'fl_old']);
    }

    /**
     * Test the API Search filters and sorting.
     */
    public function test_api_jobs_endpoint_filters_properly(): void
    {
        // Seed some jobs
        Job::create([
            'flowmingo_job_id' => 'fl_1',
            'title' => 'Laravel Developer',
            'slug' => 'laravel-developer',
            'department' => 'Engineering',
            'employment_type' => 'Full-time',
            'location' => 'Chicago',
            'remote' => false,
            'featured' => true,
            'status' => 'open',
            'apply_url' => 'https://apply.com',
            'published_at' => now()->subDays(2),
        ]);

        Job::create([
            'flowmingo_job_id' => 'fl_2',
            'title' => 'React Developer',
            'slug' => 'react-developer',
            'department' => 'Engineering',
            'employment_type' => 'Contract',
            'location' => 'Remote',
            'remote' => true,
            'featured' => false,
            'status' => 'open',
            'apply_url' => 'https://apply.com',
            'published_at' => now()->subDay(),
        ]);

        // Search text
        $response = $this->getJson('/v1/jobs?search=React');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'React Developer');

        // Filter Remote
        $response = $this->getJson('/v1/jobs?remote=true');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'React Developer');

        // Filter Department
        $response = $this->getJson('/v1/jobs?department=Engineering');
        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
    }

    /**
     * Test GET /api/v1/jobs/{slug} endpoint and caching.
     */
    public function test_api_job_detail_endpoint_and_cache(): void
    {
        $job = Job::create([
            'flowmingo_job_id' => 'fl_detail',
            'title' => 'Product Manager',
            'slug' => 'product-manager',
            'department' => 'Product',
            'employment_type' => 'Full-time',
            'location' => 'Remote',
            'status' => 'open',
            'apply_url' => 'https://apply.com',
            'salary_min' => 100000,
            'salary_max' => 120000,
            'salary_currency' => 'USD',
        ]);

        // Test normal GET
        $response = $this->getJson('/v1/jobs/product-manager');
        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Product Manager');
        $response->assertJsonPath('salary_range', '$100,000 - $120,000');

        // Assert cache was created
        $this->assertTrue(Cache::has('job_detail_' . md5('product-manager')));

        // Update title directly in DB bypass repository
        $job->update(['title' => 'Direct Title Change']);

        // Fetch again, should still return Product Manager from cache
        $response = $this->getJson('/v1/jobs/product-manager');
        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Product Manager');

        // Clear cache and fetch again
        Cache::flush();
        $response = $this->getJson('/v1/jobs/product-manager');
        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Direct Title Change');
    }

    /**
     * Test the SyncJobsJob executes and triggers repository sync.
     */
    public function test_sync_jobs_job_dispatches_and_reconciles(): void
    {
        // Mock Flowmingo API call
        Http::fake([
            'https://api.flowmingo.com/v1/integration/me/v1' => Http::response([
                'organization_id' => 21234
            ], 200),
            'https://api.flowmingo.com/v1/integration/hiring/job-posts/v1' => Http::response([
                'data' => [
                    [
                        'id' => 'fl_job_sync',
                        'title' => 'DevOps Engineer',
                        'status' => 1,
                        'created_at' => '2026-07-04T12:00:00Z',
                    ]
                ]
            ], 200),
            'https://api.flowmingo.com/v1/integration/hiring/interview-sets/v1' => Http::response([
                'data' => [
                    [
                        'id' => 'set_sync',
                        'title' => 'DevOps Engineer Interview Set',
                        'status' => 1,
                        'set_type' => 1,
                        'created_at' => '2026-07-04T12:00:00Z',
                    ]
                ]
            ], 200),
        ]);

        // Execute job
        (new SyncJobsJob())->handle(
            app(AtsProviderInterface::class),
            app(JobRepositoryInterface::class)
        );

        // Verify DB
        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_job_sync',
            'title' => 'DevOps Engineer',
        ]);
    }

    /**
     * Test webhook rejects requests with invalid signatures.
     */
    public function test_webhook_rejects_invalid_signature(): void
    {
        config(['services.flowmingo.webhook_secret' => 'super-secret']);

        $payload = [
            'event' => 'job.created',
            'data' => [
                'id' => 'fl_webhook_1',
                'title' => 'Title',
                'apply_url' => 'https://apply.com',
            ],
        ];

        $response = $this->postJson('/v1/webhooks/flowmingo', $payload, [
            'X-Flowmingo-Signature' => 'invalid-signature'
        ]);

        $response->assertStatus(401);
        $this->assertDatabaseMissing('ats_jobs', [
            'flowmingo_job_id' => 'fl_webhook_1',
        ]);
        
        config(['services.flowmingo.webhook_secret' => null]);
    }

    /**
     * Test webhook creates/updates job with valid signature.
     */
    public function test_webhook_handles_job_created_and_updated(): void
    {
        $secret = 'super-secret';
        config(['services.flowmingo.webhook_secret' => $secret]);

        $payload = [
            'event' => 'job.created',
            'data' => [
                'id' => 'fl_webhook_2',
                'title' => 'Webhook Developer',
                'slug' => 'webhook-developer',
                'department' => 'Engineering',
                'employment_type' => 'Full-time',
                'location' => 'Remote',
                'status' => 'open',
                'apply_url' => 'https://apply.com/webhook',
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', $payloadJson, $secret);

        $response = $this->postJson('/v1/webhooks/flowmingo', $payload, [
            'X-Flowmingo-Signature' => $signature
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_webhook_2',
            'title' => 'Webhook Developer',
            'status' => 'open',
        ]);

        // Now test job.updated
        $payload['event'] = 'job.updated';
        $payload['data']['title'] = 'Updated Webhook Developer';

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', $payloadJson, $secret);

        $response = $this->postJson('/v1/webhooks/flowmingo', $payload, [
            'X-Flowmingo-Signature' => $signature
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_webhook_2',
            'title' => 'Updated Webhook Developer',
        ]);

        config(['services.flowmingo.webhook_secret' => null]);
    }

    /**
     * Test webhook handles job.deleted / closed events.
     */
    public function test_webhook_handles_job_deleted_and_closed(): void
    {
        $secret = 'super-secret';
        config(['services.flowmingo.webhook_secret' => $secret]);

        // Preseed
        Job::create([
            'flowmingo_job_id' => 'fl_webhook_delete',
            'title' => 'Will Be Deleted',
            'slug' => 'will-be-deleted',
            'department' => 'Engineering',
            'employment_type' => 'Full-time',
            'location' => 'Remote',
            'status' => 'open',
            'apply_url' => 'https://apply.com',
        ]);

        $payload = [
            'event' => 'job.deleted',
            'data' => [
                'id' => 'fl_webhook_delete',
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', $payloadJson, $secret);

        $response = $this->postJson('/v1/webhooks/flowmingo', $payload, [
            'X-Flowmingo-Signature' => $signature
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('ats_jobs', [
            'flowmingo_job_id' => 'fl_webhook_delete',
            'status' => 'closed',
        ]);
        $this->assertSoftDeleted('ats_jobs', [
            'flowmingo_job_id' => 'fl_webhook_delete',
        ]);

        config(['services.flowmingo.webhook_secret' => null]);
    }
}
