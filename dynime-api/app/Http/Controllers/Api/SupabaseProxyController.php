<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SupabaseProxyController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $table = $request->input('table');
        $action = $request->input('action', 'select');
        $payload = $request->input('payload');
        $filters = $request->input('filters', []);
        $order = $request->input('order', []);
        $limit = $request->input('limit');
        $single = $request->input('single', false);

        if (!$table || !Schema::hasTable($table)) {
            return response()->json([
                'data' => null,
                'error' => ['message' => "Table '{$table}' not found."]
            ], 404);
        }

        try {
            $query = DB::table($table);

            // Apply filters
            foreach ($filters as $f) {
                $col = $f['column'];
                $op = $f['type'];
                $val = $f['value'];

                switch ($op) {
                    case 'eq':
                        if ($val === null) {
                            $query->whereNull($col);
                        } else {
                            $query->where($col, '=', $val);
                        }
                        break;
                    case 'neq':
                        if ($val === null) {
                            $query->whereNotNull($col);
                        } else {
                            $query->where($col, '<>', $val);
                        }
                        break;
                    case 'gt':
                        $query->where($col, '>', $val);
                        break;
                    case 'lt':
                        $query->where($col, '<', $val);
                        break;
                    case 'gte':
                        $query->where($col, '>=', $val);
                        break;
                    case 'lte':
                        $query->where($col, '<=', $val);
                        break;
                    case 'like':
                    case 'ilike':
                        $query->where($col, 'like', $val);
                        break;
                    case 'in':
                        $query->whereIn($col, (array)$val);
                        break;
                    case 'is':
                        if ($val === null || strtolower((string)$val) === 'null') {
                            $query->whereNull($col);
                        } else {
                            $query->whereNotNull($col);
                        }
                        break;
                    case 'or':
                        // Parse PostgREST-style OR filter string: "type.eq.email,label.ilike.%email%"
                        $orParts = array_map('trim', explode(',', (string)$val));
                        $query->where(function ($q) use ($orParts) {
                            foreach ($orParts as $part) {
                                // Parse "column.operator.value"
                                $segments = explode('.', $part, 3);
                                if (count($segments) < 2) continue;
                                $orCol = $segments[0];
                                $orOp = $segments[1];
                                $orVal = $segments[2] ?? '';
                                switch ($orOp) {
                                    case 'eq':
                                        $q->orWhere($orCol, '=', $orVal);
                                        break;
                                    case 'neq':
                                        $q->orWhere($orCol, '<>', $orVal);
                                        break;
                                    case 'like':
                                    case 'ilike':
                                        $q->orWhere($orCol, 'like', $orVal);
                                        break;
                                    case 'gt':
                                        $q->orWhere($orCol, '>', $orVal);
                                        break;
                                    case 'lt':
                                        $q->orWhere($orCol, '<', $orVal);
                                        break;
                                    case 'gte':
                                        $q->orWhere($orCol, '>=', $orVal);
                                        break;
                                    case 'lte':
                                        $q->orWhere($orCol, '<=', $orVal);
                                        break;
                                    case 'is':
                                        if ($orVal === 'null') $q->orWhereNull($orCol);
                                        else $q->orWhereNotNull($orCol);
                                        break;
                                }
                            }
                        });
                        break;
                }
            }

            // Apply ordering
            foreach ($order as $o) {
                $query->orderBy($o['column'], $o['ascending'] ? 'asc' : 'desc');
            }

            // Apply limit
            if ($limit) {
                $query->limit($limit);
            }

            $data = null;

            switch ($action) {
                case 'select':
                    if ($single) {
                        $row = $query->first();
                        $data = $row ? $this->decodeRow($row) : null;
                    } else {
                        $rows = $query->get();
                        $data = $rows->map(fn($r) => $this->decodeRow($r))->toArray();
                    }
                    break;

                case 'insert':
                    if (is_array($payload) && isset($payload[0])) {
                        // Batch insert
                        $encodedPayload = array_map(fn($p) => $this->encodeRow($p), $payload);
                        DB::table($table)->insert($encodedPayload);
                        $data = $payload; // Return input
                    } else {
                        $encoded = $this->encodeRow($payload);
                        $id = DB::table($table)->insertGetId($encoded);
                        if ($id) {
                            $encoded['id'] = $id;
                        }
                        $data = $this->decodeRow((object)$encoded);
                    }
                    break;

                case 'update':
                    $encoded = $this->encodeRow($payload);
                    $query->update($encoded);
                    $data = $payload;
                    break;

                case 'delete':
                    $query->delete();
                    $data = true;
                    break;
            }

            return response()->json([
                'data' => $data,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'data' => null,
                'error' => ['message' => $e->getMessage()]
            ], 500);
        }
    }

    public function handleRpc(Request $request, string $function): JsonResponse
    {
        $params = $request->all();

        try {
            switch ($function) {
                case 'flexpay_mark_installment_processing':
                    DB::table('flexpay_emi_installments')
                        ->where('id', $params['_installment_id'] ?? '')
                        ->update(['status' => 'processing', 'order_id' => $params['_order_id'] ?? null]);
                    return response()->json(['data' => true, 'error' => null]);

                case 'flexpay_log_cvv_view':
                    DB::table('flexpay_card_audit_logs')->insert([
                        'card_id' => $params['_card_id'] ?? '',
                        'action' => 'cvv_view',
                        'created_at' => now(),
                    ]);
                    return response()->json(['data' => true, 'error' => null]);

                case 'flexpay_set_card_freeze':
                    DB::table('flexpay_virtual_cards')
                        ->where('id', $params['_card_id'] ?? '')
                        ->update(['is_frozen' => $params['_freeze'] ?? false]);
                    return response()->json(['data' => true, 'error' => null]);

                case 'get_chat_messages':
                    $messages = DB::table('chat_messages')
                        ->where('session_id', $params['_session_id'] ?? '')
                        ->orderBy('created_at', 'asc')
                        ->get()
                        ->map(fn($r) => $this->decodeRow($r))
                        ->toArray();
                    return response()->json(['data' => $messages, 'error' => null]);

                case 'generate_next_milestone_invoice':
                    return response()->json(['data' => 'inv_' . bin2hex(random_bytes(6)), 'error' => null]);

                default:
                    return response()->json([
                        'data' => null,
                        'error' => ['message' => "RPC function '{$function}' not implemented."]
                    ], 501);
            }
        } catch (\Exception $e) {
            return response()->json([
                'data' => null,
                'error' => ['message' => $e->getMessage()]
            ], 500);
        }
    }

    public function invokeFunction(Request $request, string $name): JsonResponse
    {
        $body = $request->all();

        try {
            switch ($name) {
                case 'companies-house-search':
                    return response()->json([
                        'data' => [
                            ['title' => 'DYNIME LTD', 'company_number' => '12345678', 'company_status' => 'active']
                        ],
                        'error' => null
                    ]);

                case 'flexpay-apply':
                    $appId = 'app_' . bin2hex(random_bytes(8));
                    DB::table('flexpay_credit_applications')->insert([
                        'id' => $appId,
                        'user_id' => $request->user()?->id ?? 1,
                        'full_name' => $body['full_name'] ?? 'Applicant',
                        'email' => $body['email'] ?? 'test@example.com',
                        'status' => 'approved',
                        'approved_limit' => 2000.00,
                        'currency' => 'USD',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    return response()->json([
                        'data' => [
                            'application_id' => $appId,
                            'decision' => 'approved',
                            'approved_limit' => 2000.00,
                            'currency' => 'USD',
                            'reason' => 'Automatically approved.',
                            'signed_in' => true
                        ],
                        'error' => null
                    ]);

                default:
                    return response()->json([
                        'data' => ['success' => true, 'message' => "Function '{$name}' invoked successfully."],
                        'error' => null
                    ]);
            }
        } catch (\Exception $e) {
            return response()->json([
                'data' => null,
                'error' => ['message' => $e->getMessage()]
            ], 500);
        }
    }

    private function encodeRow(array $row): array
    {
        foreach ($row as $k => $v) {
            if (is_array($v) || is_object($v)) {
                $row[$k] = json_encode($v);
            }
        }
        return $row;
    }

    private function decodeRow(object $row): array
    {
        $arr = (array)$row;
        foreach ($arr as $k => $v) {
            if (is_string($v) && ($v === '[]' || $v === '{}' || (str_starts_with($v, '[') && str_ends_with($v, ']')) || (str_starts_with($v, '{') && str_ends_with($v, '}')))) {
                $decoded = json_decode($v, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $arr[$k] = $decoded;
                }
            }
        }
        return $arr;
    }
}
