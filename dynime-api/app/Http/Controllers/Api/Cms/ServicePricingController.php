<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\ServicePricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServicePricingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ServicePricing::all());
    }

    public function show($serviceSlug): JsonResponse
    {
        $pricing = ServicePricing::where('service_slug', $serviceSlug)->first();
        return response()->json($pricing);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'service_slug' => 'required|string',
            'service_title' => 'required|string',
            'is_enabled' => 'nullable|boolean',
            'tiers' => 'nullable|array',
            'quote_settings' => 'nullable|array',
        ]);

        $pricing = ServicePricing::updateOrCreate(
            ['service_slug' => $data['service_slug']],
            [
                'service_title' => $data['service_title'],
                'is_enabled' => $data['is_enabled'] ?? true,
                'tiers' => $data['tiers'] ?? [],
                'quote_settings' => $data['quote_settings'] ?? [],
            ]
        );

        return response()->json($pricing);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $pricing = ServicePricing::where('id', $id)->orWhere('service_slug', $id)->firstOrFail();
        
        $data = $request->validate([
            'service_title' => 'nullable|string',
            'is_enabled' => 'nullable|boolean',
            'tiers' => 'nullable|array',
            'quote_settings' => 'nullable|array',
        ]);

        $pricing->update($data);

        return response()->json($pricing);
    }

    public function destroy($id): JsonResponse
    {
        $pricing = ServicePricing::where('id', $id)->orWhere('service_slug', $id)->firstOrFail();
        $pricing->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
