<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VerificationController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $total = DB::table('verification_requests')->count();
        $kycCount = DB::table('verification_requests')->where('type', 'kyc')->count();
        $kybCount = DB::table('verification_requests')->where('type', 'kyb')->count();
        $approved = DB::table('verification_requests')->where('status', 'verified')->count();
        $pending = DB::table('verification_requests')->where('status', 'pending')->count();
        $declined = DB::table('verification_requests')->where('status', 'rejected')->count();
        $inReview = DB::table('verification_requests')->where('status', 'in_review')->count();
        $expired = DB::table('verification_requests')->where('status', 'expired')->count();

        // Recent activity log
        $recentLogs = DB::table('verification_logs')
            ->join('verification_requests', 'verification_logs.verification_request_id', '=', 'verification_requests.id')
            ->orderBy('verification_logs.created_at', 'desc')
            ->take(15)
            ->select([
                'verification_logs.id',
                'verification_logs.action',
                'verification_logs.description',
                'verification_logs.created_at',
                'verification_requests.type as request_type',
                'verification_requests.customer_name',
                'verification_requests.customer_email',
            ])
            ->get();

        // Recent webhook events log
        $recentEvents = DB::table('verification_events')
            ->join('verification_requests', 'verification_events.verification_request_id', '=', 'verification_requests.id')
            ->orderBy('verification_events.created_at', 'desc')
            ->take(15)
            ->select([
                'verification_events.id',
                'verification_events.webhook_type',
                'verification_events.created_at',
                'verification_requests.didit_session_id as session_id',
                'verification_requests.type as request_type',
            ])
            ->get();

        return response()->json([
            'overview' => [
                'total' => $total,
                'kyc' => $kycCount,
                'kyb' => $kybCount,
                'approved' => $approved,
                'pending' => $pending,
                'declined' => $declined,
                'inReview' => $inReview,
                'expired' => $expired,
            ],
            'recentLogs' => $recentLogs,
            'webhookLogs' => $recentEvents,
        ]);
    }

    public function requests(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $status = $request->query('status');
        $page = (int) $request->query('page', 1);
        $limit = (int) $request->query('limit', 15);

        $query = DB::table('verification_requests');
        if ($type) {
            $query->where('type', $type);
        }
        if ($status) {
            $query->where('status', $status);
        }

        $total = $query->count();
        $offset = ($page - 1) * $limit;

        $items = $query->orderBy('created_at', 'desc')
            ->skip($offset)
            ->take($limit)
            ->get();

        $mappedItems = [];
        foreach ($items as $item) {
            $invoiceNumber = 'N/A';
            if ($item->service_order_id) {
                $order = DB::table('orders')->where('id', $item->service_order_id)->first();
                if ($order) {
                    $invoiceNumber = $order->invoice_number ?: 'N/A';
                    if (empty($item->customer_name)) {
                        $item->customer_name = $order->customer_name ?: 'N/A';
                    }
                    if (empty($item->customer_email)) {
                        $item->customer_email = $order->customer_email ?: 'N/A';
                    }
                }
            }

            $mappedItems[] = [
                'id' => $item->id,
                'type' => $item->type,
                'didit_session_id' => $item->didit_session_id,
                'status' => $item->status,
                'decision' => $item->decision,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
                'verification_url' => $item->verification_url,
                'customer_name' => $item->customer_name ?: 'N/A',
                'customer_email' => $item->customer_email ?: 'N/A',
                'invoice_number' => $invoiceNumber,
            ];
        }

        return response()->json([
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'items' => $mappedItems,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $item = DB::table('verification_requests')->where('id', $id)->first();
        if (!$item) {
            return response()->json(['message' => 'Verification request not found'], 404);
        }

        $invoiceNumber = 'N/A';
        $orderTotal = 0.00;
        if ($item->service_order_id) {
            $order = DB::table('orders')->where('id', $item->service_order_id)->first();
            if ($order) {
                $invoiceNumber = $order->invoice_number ?: 'N/A';
                $orderTotal = (float) $order->total;
                if (empty($item->customer_name)) {
                    $item->customer_name = $order->customer_name;
                }
                if (empty($item->customer_email)) {
                    $item->customer_email = $order->customer_email;
                }
            }
        }

        $logs = DB::table('verification_logs')
            ->where('verification_request_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $events = DB::table('verification_events')
            ->where('verification_request_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'id' => $item->id,
            'type' => $item->type,
            'didit_session_id' => $item->didit_session_id,
            'status' => $item->status,
            'decision' => $item->decision,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
            'verification_url' => $item->verification_url,
            'qr_code_url' => $item->qr_code_url,
            'company_name' => $item->company_name,
            'country' => $item->country,
            'customer_name' => $item->customer_name ?: 'N/A',
            'customer_email' => $item->customer_email ?: 'N/A',
            'invoice_number' => $invoiceNumber,
            'order_total' => $orderTotal,
            'logs' => $logs,
            'events' => $events,
        ]);
    }

    public function syncAll(Request $request): JsonResponse
    {
        $syncMock = $request->query('sync_mock') === 'true';

        $pending = DB::table('verification_requests')
            ->where('status', 'pending')
            ->get();

        $syncCount = 0;
        $apiKey = env('DIDIT_API_KEY') ?: '';

        foreach ($pending as $req) {
            if (!$req->didit_session_id) continue;

            $isMock = str_starts_with($req->didit_session_id, 'mock-session-') 
                || str_starts_with($req->didit_session_id, 'mock_session_');

            if ($isMock) {
                if ($syncMock) {
                    DB::table('verification_requests')->where('id', $req->id)->update([
                        'status' => 'verified',
                        'decision' => 'Approved',
                        'updated_at' => now(),
                    ]);

                    DB::table('verification_logs')->insert([
                        'id' => (string) Str::uuid(),
                        'verification_request_id' => $req->id,
                        'action' => 'status_updated',
                        'description' => 'Status synchronized: mock session marked as verified.',
                        'created_at' => now(),
                    ]);

                    $this->syncOrderStatus($req->didit_session_id, 'verified');
                    $syncCount++;
                }
            } else if ($apiKey) {
                try {
                    $diditSession = $this->syncDiditSession($req->didit_session_id, $apiKey);
                    if ($diditSession) {
                        $statusRaw = $diditSession['status'] ?? $diditSession['decision'] ?? null;
                        if ($statusRaw) {
                            $mapped = $this->mapStatus($statusRaw);
                            $companyName = $diditSession['company_name'] 
                                ?? $diditSession['data']['company_name'] 
                                ?? $diditSession['metadata']['company_name'] 
                                ?? $diditSession['data']['metadata']['company_name'] 
                                ?? $diditSession['company_details']['company_name'] 
                                ?? $diditSession['company_details']['legal_name'] 
                                ?? null;
                            
                            $country = $diditSession['country'] 
                                ?? $diditSession['data']['country'] 
                                ?? $diditSession['metadata']['country'] 
                                ?? $diditSession['data']['metadata']['country'] 
                                ?? $diditSession['company_details']['country'] 
                                ?? null;

                            $updateData = [
                                'status' => $mapped,
                                'decision' => $statusRaw,
                                'updated_at' => now(),
                            ];
                            if ($companyName) $updateData['company_name'] = $companyName;
                            if ($country) $updateData['country'] = $country;

                            if ($mapped !== $req->status || $companyName !== $req->company_name || $country !== $req->country) {
                                DB::table('verification_requests')->where('id', $req->id)->update($updateData);

                                DB::table('verification_logs')->insert([
                                    'id' => (string) Str::uuid(),
                                    'verification_request_id' => $req->id,
                                    'action' => 'status_updated',
                                    'description' => "Status synchronized with Didit API: mapped to {$mapped}.",
                                    'created_at' => now(),
                                ]);

                                $this->syncOrderStatus($req->didit_session_id, $mapped);
                                $syncCount++;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Ignore
                }
            }
        }

        return response()->json([
            'success' => true,
            'synced_count' => $syncCount,
        ]);
    }

    public function syncSingle(string $id): JsonResponse
    {
        $req = DB::table('verification_requests')->where('id', $id)->first();
        if (!$req) {
            return response()->json(['message' => 'Verification request not found'], 404);
        }

        $apiKey = env('DIDIT_API_KEY') ?: '';
        $synced = false;

        $isMock = str_starts_with($req->didit_session_id, 'mock-session-') 
            || str_starts_with($req->didit_session_id, 'mock_session_');

        if ($isMock) {
            DB::table('verification_requests')->where('id', $req->id)->update([
                'status' => 'verified',
                'decision' => 'Approved',
                'updated_at' => now(),
            ]);

            DB::table('verification_logs')->insert([
                'id' => (string) Str::uuid(),
                'verification_request_id' => $req->id,
                'action' => 'status_updated',
                'description' => 'Status synchronized: mock session marked as verified.',
                'created_at' => now(),
            ]);

            $this->syncOrderStatus($req->didit_session_id, 'verified');
            $synced = true;
        } else if ($apiKey && $req->didit_session_id) {
            try {
                $diditSession = $this->syncDiditSession($req->didit_session_id, $apiKey);
                if ($diditSession) {
                    $statusRaw = $diditSession['status'] ?? $diditSession['decision'] ?? null;
                    if ($statusRaw) {
                        $mapped = $this->mapStatus($statusRaw);
                        $companyName = $diditSession['company_name'] 
                            ?? $diditSession['data']['company_name'] 
                            ?? $diditSession['metadata']['company_name'] 
                            ?? $diditSession['data']['metadata']['company_name'] 
                            ?? $diditSession['company_details']['company_name'] 
                            ?? $diditSession['company_details']['legal_name'] 
                            ?? null;
                        
                        $country = $diditSession['country'] 
                            ?? $diditSession['data']['country'] 
                            ?? $diditSession['metadata']['country'] 
                            ?? $diditSession['data']['metadata']['country'] 
                            ?? $diditSession['company_details']['country'] 
                            ?? null;

                        $updateData = [
                            'status' => $mapped,
                            'decision' => $statusRaw,
                            'updated_at' => now(),
                        ];
                        if ($companyName) $updateData['company_name'] = $companyName;
                        if ($country) $updateData['country'] = $country;

                        DB::table('verification_requests')->where('id', $req->id)->update($updateData);

                        DB::table('verification_logs')->insert([
                            'id' => (string) Str::uuid(),
                            'verification_request_id' => $req->id,
                            'action' => 'status_updated',
                            'description' => "Status synchronized with Didit API: mapped to {$mapped}.",
                            'created_at' => now(),
                        ]);

                        $this->syncOrderStatus($req->didit_session_id, $mapped);
                        $synced = true;
                    }
                }
            } catch (\Exception $e) {
                // Ignore
            }
        }

        return response()->json([
            'success' => $synced,
            'message' => $synced ? 'Sync completed successfully' : 'Sync failed or no API key configured',
        ]);
    }

    private function syncOrderStatus(string $sessionId, string $status): void
    {
        if (!$sessionId) return;
        try {
            $matched = DB::table('orders')
                ->where('service_brief->identity_verification->session_id', $sessionId)
                ->first();

            if ($matched) {
                $brief = json_decode($matched->service_brief, true) ?: [];
                if (isset($brief['identity_verification'])) {
                    $brief['identity_verification']['status'] = $status;
                    $brief['identity_verification']['updated_at'] = now()->toIso8601String();
                    DB::table('orders')->where('id', $matched->id)->update([
                        'service_brief' => json_encode($brief),
                        'updated_at' => now(),
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to sync order status for session {$sessionId}: " . $e->getMessage());
        }
    }

    private function syncDiditSession(string $sessionId, string $apiKey): ?array
    {
        if (str_starts_with($sessionId, 'mock-session-') || str_starts_with($sessionId, 'mock_session_')) {
            return [
                'session_id' => $sessionId,
                'status' => 'Approved',
                'decision' => 'Approved',
                'mock' => true,
            ];
        }
        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
            ])->get("https://verification.didit.me/v3/session/{$sessionId}/decision/");

            if ($response->successful()) {
                return $response->json();
            }
            return null;
        } catch (\Exception $e) {
            Log::warning("Failed to fetch Didit session status for {$sessionId}: " . $e->getMessage());
            return null;
        }
    }

    private function mapStatus(?string $raw): string
    {
        if (!$raw) return 'pending';
        $v = strtolower($raw);
        if (in_array($v, ['approved', 'verified', 'complete', 'completed', 'success', 'confirmed'])) {
            return 'verified';
        }
        if (in_array($v, ['declined', 'rejected', 'failed'])) {
            return 'rejected';
        }
        if (in_array($v, ['in_review', 'review', 'manual_review', 'kyc_review'])) {
            return 'in_review';
        }
        if (in_array($v, ['expired', 'abandoned', 'timeout'])) {
            return 'expired';
        }
        if (in_array($v, ['pending', 'not_started', 'initiated', 'started', 'in_progress'])) {
            return 'pending';
        }
        return $v;
    }
}
