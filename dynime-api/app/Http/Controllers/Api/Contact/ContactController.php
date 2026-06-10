<?php

namespace App\Http\Controllers\Api\Contact;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use App\Models\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class ContactController extends Controller
{
    public function submit(Request $request): JsonResponse
    {
        // Rate limit: 5 submissions per IP per hour
        $key = 'contact_' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Too many submissions. Please try again in {$seconds} seconds.",
            ], 429);
        }
        RateLimiter::hit($key, 3600);

        $data = $request->validate([
            'type'    => 'nullable|in:contact,inquiry,quote',
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:500',
            'message' => 'required|string|max:5000',
            'service' => 'nullable|string|max:255',
        ]);

        $submission = ContactSubmission::create([
            ...$data,
            'type'       => $data['type'] ?? 'contact',
            'ip_address' => $request->ip(),
            'metadata'   => ['user_agent' => $request->userAgent()],
        ]);

        // Send notification email to admin
        try {
            \App\Services\MailConfigurator::configure('general');
            $body = "New contact from: {$data['name']} ({$data['email']})\n\n"
                . "Subject: " . ($data['subject'] ?? 'N/A') . "\n"
                . "Service: " . ($data['service'] ?? 'N/A') . "\n\n"
                . "Message:\n{$data['message']}";

            Mail::raw($body, function ($message) use ($data) {
                $message->to(config('mail.from.address'))
                    ->subject('New Contact: ' . ($data['subject'] ?? 'Message from ' . $data['name']));
            });
        } catch (\Exception $e) {
            // Don't fail the request if email fails
        }

        return response()->json([
            'message' => 'Message received! We will get back to you within 24 hours.',
            'id'      => $submission->id,
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $submissions = ContactSubmission::query()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->orderByDesc('created_at')
            ->paginate(50);
        return response()->json($submissions);
    }

    public function adminShow(int $id): JsonResponse
    {
        $submission = ContactSubmission::findOrFail($id);
        if ($submission->status === 'new') {
            $submission->update(['status' => 'read']);
        }
        return response()->json($submission);
    }

    public function adminUpdate(Request $request, int $id): JsonResponse
    {
        $submission = ContactSubmission::findOrFail($id);
        $data = $request->validate([
            'status'      => 'sometimes|in:new,read,replied,archived',
            'admin_notes' => 'nullable|string',
        ]);
        $submission->update($data);
        return response()->json($submission);
    }

    public function adminDestroy(int $id): JsonResponse
    {
        ContactSubmission::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function officeLocations(): JsonResponse
    {
        $locations = OfficeLocation::where('is_active', true)
            ->orderBy('sort_order')
            ->get();
        return response()->json($locations);
    }

    public function storeOfficeLocation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'address'     => 'nullable|string',
            'city'        => 'nullable|string|max:100',
            'country'     => 'nullable|string|max:100',
            'phone'       => 'nullable|string|max:50',
            'email'       => 'nullable|email|max:255',
            'coordinates' => 'nullable|string|max:100',
            'is_active'   => 'nullable|boolean',
            'sort_order'  => 'nullable|integer',
        ]);
        return response()->json(OfficeLocation::create($data), 201);
    }

    public function updateOfficeLocation(Request $request, int $id): JsonResponse
    {
        $location = OfficeLocation::findOrFail($id);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'address'     => 'nullable|string',
            'city'        => 'nullable|string|max:100',
            'country'     => 'nullable|string|max:100',
            'phone'       => 'nullable|string|max:50',
            'email'       => 'nullable|email|max:255',
            'coordinates' => 'nullable|string|max:100',
            'is_active'   => 'nullable|boolean',
            'sort_order'  => 'nullable|integer',
        ]);
        $location->update($data);
        return response()->json($location);
    }

    public function destroyOfficeLocation(int $id): JsonResponse
    {
        OfficeLocation::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }
}
