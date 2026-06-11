<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutTrackingController extends Controller
{
    public function track(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'cart_data' => 'nullable|array',
            'checkout_details' => 'nullable|array',
        ]);

        $email = trim(strtolower($request->email));
        $name = $request->name;
        $phone = $request->phone;
        $cartData = $request->cart_data ? json_encode($request->cart_data) : null;
        $checkoutDetails = $request->checkout_details ? json_encode($request->checkout_details) : null;

        $existing = DB::table('abandoned_checkouts')->where('email', $email)->first();

        if ($existing) {
            DB::table('abandoned_checkouts')->where('id', $existing->id)->update([
                'name' => $name ?? $existing->name,
                'phone' => $phone ?? $existing->phone,
                'cart_data' => $cartData ?? $existing->cart_data,
                'checkout_details' => $checkoutDetails ?? $existing->checkout_details,
                'status' => 'abandoned', // Reset to abandoned on new activity
                'email_sent' => false,   // Reset email status on new activity
                'last_active_at' => now(),
                'updated_at' => now(),
            ]);
            $id = $existing->id;
        } else {
            $id = (string)Str::uuid();
            DB::table('abandoned_checkouts')->insert([
                'id' => $id,
                'email' => $email,
                'name' => $name,
                'phone' => $phone,
                'cart_data' => $cartData,
                'checkout_details' => $checkoutDetails,
                'status' => 'abandoned',
                'email_sent' => false,
                'last_active_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'id' => $id,
        ]);
    }
}
