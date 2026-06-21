<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CouponsController extends Controller
{
    public function index(): JsonResponse
    {
        $coupons = DB::table('coupons')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($coupon) {
                if (isset($coupon->milestone_stages) && is_string($coupon->milestone_stages)) {
                    $coupon->milestone_stages = json_decode($coupon->milestone_stages, true);
                }
                return $coupon;
            });

        return response()->json(['data' => $coupons]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        if (empty($data['code']) || empty($data['discount_type']) || !isset($data['discount_value'])) {
            return response()->json(['message' => 'Missing required fields: code, discount_type, discount_value'], 400);
        }

        $id = (string)Str::uuid();
        $code = strtoupper(trim($data['code']));

        // Check if code is unique
        $existing = DB::table('coupons')->where('code', $code)->first();
        if ($existing) {
            return response()->json(['message' => 'Coupon code already exists'], 400);
        }

        $milestoneStages = null;
        if (isset($data['milestone_stages'])) {
            $milestoneStages = is_array($data['milestone_stages']) ? json_encode($data['milestone_stages']) : $data['milestone_stages'];
        }

        DB::table('coupons')->insert([
            'id' => $id,
            'code' => $code,
            'description' => $data['description'] ?? null,
            'discount_type' => $data['discount_type'],
            'discount_value' => (double)$data['discount_value'],
            'min_order_amount' => (double)($data['min_order_amount'] ?? 0.00),
            'max_discount_amount' => isset($data['max_discount_amount']) ? (double)$data['max_discount_amount'] : null,
            'usage_limit' => isset($data['usage_limit']) ? (int)$data['usage_limit'] : null,
            'usage_count' => 0,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'is_active' => filter_var($data['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
            'is_milestone' => filter_var($data['is_milestone'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'milestone_mode' => $data['milestone_mode'] ?? null,
            'advance_percent' => isset($data['advance_percent']) ? (int)$data['advance_percent'] : null,
            'milestone_stages' => $milestoneStages,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $newCoupon = DB::table('coupons')->where('id', $id)->first();
        if ($newCoupon && isset($newCoupon->milestone_stages) && is_string($newCoupon->milestone_stages)) {
            $newCoupon->milestone_stages = json_decode($newCoupon->milestone_stages, true);
        }

        return response()->json(['data' => $newCoupon], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->all();
        $coupon = DB::table('coupons')->where('id', $id)->first();
        if (!$coupon) {
            return response()->json(['message' => 'Coupon not found'], 404);
        }

        $update = ['updated_at' => now()];

        if (isset($data['code'])) {
            $code = strtoupper(trim($data['code']));
            $existing = DB::table('coupons')->where('code', $code)->where('id', '!=', $id)->first();
            if ($existing) {
                return response()->json(['message' => 'Coupon code already exists'], 400);
            }
            $update['code'] = $code;
        }

        if (array_key_exists('description', $data)) $update['description'] = $data['description'];
        if (isset($data['discount_type'])) $update['discount_type'] = $data['discount_type'];
        if (isset($data['discount_value'])) $update['discount_value'] = (double)$data['discount_value'];
        if (isset($data['min_order_amount'])) $update['min_order_amount'] = (double)$data['min_order_amount'];
        if (array_key_exists('max_discount_amount', $data)) $update['max_discount_amount'] = $data['max_discount_amount'] ? (double)$data['max_discount_amount'] : null;
        if (array_key_exists('usage_limit', $data)) $update['usage_limit'] = $data['usage_limit'] ? (int)$data['usage_limit'] : null;
        if (array_key_exists('starts_at', $data)) $update['starts_at'] = $data['starts_at'] ?: null;
        if (array_key_exists('expires_at', $data)) $update['expires_at'] = $data['expires_at'] ?: null;
        if (isset($data['is_active'])) $update['is_active'] = filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN);
        if (isset($data['is_milestone'])) $update['is_milestone'] = filter_var($data['is_milestone'], FILTER_VALIDATE_BOOLEAN);
        if (array_key_exists('milestone_mode', $data)) $update['milestone_mode'] = $data['milestone_mode'] ?: null;
        if (array_key_exists('advance_percent', $data)) $update['advance_percent'] = $data['advance_percent'] ? (int)$data['advance_percent'] : null;
        if (array_key_exists('milestone_stages', $data)) {
            $update['milestone_stages'] = is_array($data['milestone_stages']) ? json_encode($data['milestone_stages']) : $data['milestone_stages'];
        }

        DB::table('coupons')->where('id', $id)->update($update);

        $updatedCoupon = DB::table('coupons')->where('id', $id)->first();
        if ($updatedCoupon && isset($updatedCoupon->milestone_stages) && is_string($updatedCoupon->milestone_stages)) {
            $updatedCoupon->milestone_stages = json_decode($updatedCoupon->milestone_stages, true);
        }

        return response()->json(['data' => $updatedCoupon]);
    }

    public function destroy(string $id): JsonResponse
    {
        $coupon = DB::table('coupons')->where('id', $id)->first();
        if (!$coupon) {
            return response()->json(['message' => 'Coupon not found'], 404);
        }

        DB::table('coupons')->where('id', $id)->delete();
        return response()->json(['data' => true]);
    }
}
