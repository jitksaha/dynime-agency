<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\ServiceAddon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceAddonController extends Controller
{
    public function show($serviceSlug): JsonResponse
    {
        $addons = ServiceAddon::where('service_slug', $serviceSlug)
            ->orderBy('sort_order')
            ->get();
        return response()->json($addons);
    }

    public function store(Request $request, $serviceSlug): JsonResponse
    {
        $data = $request->validate([
            'addons' => 'required|array',
            'addons.*.id' => 'required|string',
            'addons.*.name' => 'required|string',
            'addons.*.description' => 'nullable|string',
            'addons.*.price_usd' => 'required|numeric',
            'addons.*.period' => 'required|string',
            'addons.*.is_popular' => 'required|boolean',
            'addons.*.is_active' => 'required|boolean',
            'addons.*.sort_order' => 'required|integer',
        ]);

        $saved = [];
        foreach ($data['addons'] as $addon) {
            $row = ServiceAddon::updateOrCreate(
                ['id' => $addon['id']],
                [
                    'service_slug' => $serviceSlug,
                    'name' => $addon['name'],
                    'description' => $addon['description'] ?? null,
                    'price_usd' => $addon['price_usd'],
                    'period' => $addon['period'],
                    'is_popular' => $addon['is_popular'],
                    'is_active' => $addon['is_active'],
                    'sort_order' => $addon['sort_order'],
                ]
            );
            $saved[] = $row;
        }

        return response()->json($saved);
    }

    public function destroy($id): JsonResponse
    {
        $addon = ServiceAddon::where('id', $id)->firstOrFail();
        $addon->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
