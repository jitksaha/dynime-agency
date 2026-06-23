<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    public function index(): JsonResponse
    {
        $services = Cache::remember('services_active', 3600, fn() =>
            Service::active()->select([
                'id', 'slug', 'title', 'category', 'excerpt',
                'icon', 'cover_image_url', 'is_featured',
            ])->get()->toArray()
        );
        return response()->json($services);
    }

    public function show(string $slug): JsonResponse
    {
        $service = Cache::remember('service_' . $slug, 3600, fn() =>
            Service::where('slug', $slug)->where('is_active', true)->firstOrFail()->toArray()
        );
        return response()->json($service);
    }

    public function categories(): JsonResponse
    {
        $cats = Cache::remember('service_categories', 3600, fn() =>
            Service::active()->distinct()->orderBy('category')->pluck('category')
        );
        return response()->json($cats);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json(Service::orderBy('sort_order')->orderByDesc('created_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:500',
            'slug'            => 'nullable|string|max:255',
            'category'        => 'nullable|string|max:100',
            'excerpt'         => 'nullable|string',
            'description'     => 'nullable|string',
            'icon'            => 'nullable|string|max:100',
            'cover_image_url' => 'nullable|url|max:500',
            'features'        => 'nullable|array',
            'pricing'         => 'nullable|array',
            'sort_order'      => 'nullable|integer',
            'is_active'       => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'meta_title'      => 'nullable|string|max:255',
            'meta_desc'       => 'nullable|string',
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);
        $service = Service::create($data);
        Cache::flush();
        return response()->json($service, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $data = $request->validate([
            'title'           => 'sometimes|string|max:500',
            'slug'            => 'sometimes|string|max:255',
            'category'        => 'nullable|string|max:100',
            'excerpt'         => 'nullable|string',
            'description'     => 'nullable|string',
            'icon'            => 'nullable|string|max:100',
            'cover_image_url' => 'nullable|url|max:500',
            'features'        => 'nullable|array',
            'pricing'         => 'nullable|array',
            'sort_order'      => 'nullable|integer',
            'is_active'       => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'meta_title'      => 'nullable|string|max:255',
            'meta_desc'       => 'nullable|string',
        ]);
        $service->update($data);
        Cache::flush();
        return response()->json($service);
    }

    public function destroy(string $id): JsonResponse
    {
        Service::findOrFail($id)->delete();
        Cache::flush();
        return response()->json(['message' => 'Deleted successfully.']);
    }
}
