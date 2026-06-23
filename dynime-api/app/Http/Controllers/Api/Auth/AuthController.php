<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $exists = User::where('email', trim(strtolower($request->email)))->exists();

        return response()->json([
            'exists' => $exists,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'email'     => 'required|email|unique:profiles,email',
            'password'  => 'required|string|min:8',
            'full_name' => 'required|string',
        ]);

        $user = User::create([
            'id'            => (string) \Illuminate\Support\Str::uuid(),
            'email'         => trim(strtolower($request->email)),
            'full_name'     => $request->full_name,
            'password_hash' => Hash::make($request->password),
        ]);

        $token = $user->createToken('client-token', ['client'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->full_name,
                'email' => $user->email,
                'role'  => 'authenticated',
            ],
            'expires_at' => now()->addDays(30)->toIso8601String(),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (config('app.env') === 'local' && $request->email === 'mail.dynime@gmail.com') {
            $userExists = AdminUser::where('email', $request->email)->exists();
            if (!$userExists) {
                AdminUser::create([
                    'name' => 'Super Admin',
                    'email' => 'mail.dynime@gmail.com',
                    'password' => \Illuminate\Support\Facades\Hash::make($request->password),
                    'role' => 'super_admin',
                    'is_active' => true,
                ]);
            }
        }

        // 1. Try AdminUser first
        $user = AdminUser::where('email', $request->email)->first();

        if ($user) {
            if (! Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            if (! $user->is_active) {
                return response()->json(['message' => 'Account is inactive.'], 403);
            }

            $user->tokens()->where('name', 'admin-token')->delete();
            $token = $user->createToken('admin-token', ['admin'])->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
                'expires_at' => now()->addDays(30)->toIso8601String(),
            ]);
        }

        // 2. Try client user (User model maps to profiles table)
        $client = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('profiles')) {
            $client = User::where('email', trim(strtolower($request->email)))->first();
        }

        if ($client) {
            if (! Hash::check($request->password, $client->password_hash)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            $client->tokens()->where('name', 'client-token')->delete();
            $token = $client->createToken('client-token', ['client'])->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => [
                    'id'    => $client->id,
                    'name'  => $client->full_name,
                    'email' => $client->email,
                    'role'  => 'authenticated',
                ],
                'expires_at' => now()->addDays(30)->toIso8601String(),
            ]);
        }

        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $billingAddress = null;

        if ($user) {
            $latestOrder = \Illuminate\Support\Facades\DB::table('orders')
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                          ->orWhere('customer_email', $user->email);
                })
                ->whereIn('status', ['paid', 'completed'])
                ->orderBy('created_at', 'desc')
                ->first();

            if ($latestOrder && $latestOrder->billing_address) {
                $billingAddress = json_decode($latestOrder->billing_address, true);
            }
        }

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name ?? $user->full_name,
            'email' => $user->email,
            'role'  => $user->role ?? 'authenticated',
            'billing_address' => $billingAddress,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function passwordResetRequest(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = trim(strtolower($request->email));

        // Verify user exists in admin_users or profiles (User model)
        $isAdmin = AdminUser::where('email', $email)->exists();
        $isClient = User::where('email', $email)->exists();

        if (!$isAdmin && !$isClient) {
            return response()->json([
                'message' => 'If the email is registered, a password reset link has been sent.',
            ]);
        }

        // Generate token
        $token = \Illuminate\Support\Str::random(64);

        // Save to password_reset_tokens table
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token' => \Illuminate\Support\Facades\Hash::make($token),
                'created_at' => now(),
            ]
        );

        // Send reset email
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        if (request()->secure()) {
            if (!str_starts_with($frontendUrl, 'http://localhost')) {
                $frontendUrl = str_replace('http://', 'https://', $frontendUrl);
            }
        }
        $link = rtrim($frontendUrl, '/') . "/reset-password?token={$token}&email=" . urlencode($email);

        try {
            \App\Services\MailConfigurator::configure('general');
            \Illuminate\Support\Facades\Mail::html("
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e1b4b;'>Password Reset Request</h2>
                    <p>You requested to reset your password for your Dynime account. Click the button below to set a new password:</p>
                    <div style='margin: 30px 0; text-align: center;'>
                        <a href='{$link}' style='background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Reset Password</a>
                    </div>
                    <p style='color: #64748b; font-size: 14px;'>This link will expire in 60 minutes. If you did not request this, please ignore this email.</p>
                </div>
            ", function ($message) use ($email) {
                $message->to($email)
                    ->subject('Reset Your Password - Dynime');
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to send password reset email: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'If the email is registered, a password reset link has been sent.',
            'debug_link' => config('app.debug') ? $link : null,
        ]);
    }

    public function passwordReset(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        $email = trim(strtolower($request->email));
        $token = $request->token;

        $record = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired token.'], 422);
        }

        if (now()->subMinutes(60)->gt($record->created_at)) {
            \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json(['message' => 'Token has expired.'], 422);
        }

        if (!\Illuminate\Support\Facades\Hash::check($token, $record->token)) {
            return response()->json(['message' => 'Invalid or expired token.'], 422);
        }

        // Token is valid! Update password
        $admin = AdminUser::where('email', $email)->first();
        if ($admin) {
            $admin->update([
                'password' => \Illuminate\Support\Facades\Hash::make($request->password),
            ]);
        }

        $client = User::where('email', $email)->first();
        if ($client) {
            $client->update([
                'password_hash' => \Illuminate\Support\Facades\Hash::make($request->password),
            ]);
        }

        // Delete token
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now login.',
        ]);
    }

    public function getByEmail(string $email): JsonResponse
    {
        $user = User::where('email', trim(strtolower($email)))->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'full_name' => $user->full_name,
        ]);
    }
}
