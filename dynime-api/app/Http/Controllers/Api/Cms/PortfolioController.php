<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\PortfolioProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class PortfolioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'portfolio_' . md5($request->category ?? 'all');
        $projects = Cache::remember($cacheKey, 3600, function () use ($request) {
            $query = PortfolioProject::published();
            if ($request->category) {
                $query->where('category', $request->category);
            }
            return $query->select([
                'id', 'title', 'slug', 'category', 'description',
                'cover_image_url', 'thumbnail_url', 'thumbnail_path', 'alt_text',
                'gallery_images', 'client_name', 'project_url', 'tags', 'technologies',
                'is_featured', 'completed_at',
            ])->get()->map(function ($p) {
                $p->thumbnail_url = $p->thumbnail_url ?? $p->cover_image_url;
                $p->cover_image_url = $p->cover_image_url ?? $p->thumbnail_url;
                $p->technologies = $p->technologies ?? $p->tags ?? [];
                $p->tags = $p->tags ?? $p->technologies ?? [];
                return $p;
            })->toArray();
        });
        return response()->json($projects);
    }

    public function show(string $slug): JsonResponse
    {
        $project = Cache::remember('portfolio_' . $slug, 3600, function () use ($slug) {
            $p = PortfolioProject::where('slug', $slug)->where('is_published', true)->firstOrFail();
            $p->thumbnail_url = $p->thumbnail_url ?? $p->cover_image_url;
            $p->cover_image_url = $p->cover_image_url ?? $p->thumbnail_url;
            $p->technologies = $p->technologies ?? $p->tags ?? [];
            $p->tags = $p->tags ?? $p->technologies ?? [];
            return $p->toArray();
        });
        return response()->json($project);
    }

    public function categories(): JsonResponse
    {
        $cats = Cache::remember('portfolio_categories', 3600, fn() =>
            PortfolioProject::published()->distinct()->orderBy('category')->pluck('category')
        );
        return response()->json($cats);
    }

    public function adminIndex(): JsonResponse
    {
        $projects = PortfolioProject::orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($p) {
                $p->thumbnail_url = $p->thumbnail_url ?? $p->cover_image_url;
                $p->cover_image_url = $p->cover_image_url ?? $p->thumbnail_url;
                $p->technologies = $p->technologies ?? $p->tags ?? [];
                $p->tags = $p->tags ?? $p->technologies ?? [];
                return $p;
            });
        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:500',
            'slug'            => 'nullable|string|max:255',
            'category'        => 'nullable|string|max:100',
            'description'     => 'nullable|string',
            'content_html'    => 'nullable|string',
            'cover_image_url' => 'nullable|url|max:500',
            'thumbnail_url'   => 'nullable|url|max:500',
            'thumbnail_path'  => 'nullable|string|max:500',
            'alt_text'        => 'nullable|string',
            'gallery_images'  => 'nullable|array',
            'client_name'     => 'nullable|string|max:255',
            'project_url'     => 'nullable|url|max:500',
            'tags'            => 'nullable|array',
            'technologies'    => 'nullable|array',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'completed_at'    => 'nullable|date',
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);

        // Fallback mapping/syncing before saving
        if (isset($data['thumbnail_url'])) {
            $data['cover_image_url'] = $data['cover_image_url'] ?? $data['thumbnail_url'];
        }
        if (isset($data['cover_image_url'])) {
            $data['thumbnail_url'] = $data['thumbnail_url'] ?? $data['cover_image_url'];
        }
        if (isset($data['technologies'])) {
            $data['tags'] = $data['tags'] ?? $data['technologies'];
        }
        if (isset($data['tags'])) {
            $data['technologies'] = $data['technologies'] ?? $data['tags'];
        }

        $project = PortfolioProject::create($data);
        Cache::flush();
        return response()->json($project, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $project = PortfolioProject::findOrFail($id);
        $data = $request->validate([
            'title'           => 'sometimes|string|max:500',
            'slug'            => 'sometimes|string|max:255',
            'category'        => 'nullable|string|max:100',
            'description'     => 'nullable|string',
            'content_html'    => 'nullable|string',
            'cover_image_url' => 'nullable|url|max:500',
            'thumbnail_url'   => 'nullable|url|max:500',
            'thumbnail_path'  => 'nullable|string|max:500',
            'alt_text'        => 'nullable|string',
            'gallery_images'  => 'nullable|array',
            'client_name'     => 'nullable|string|max:255',
            'project_url'     => 'nullable|url|max:500',
            'tags'            => 'nullable|array',
            'technologies'    => 'nullable|array',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'completed_at'    => 'nullable|date',
        ]);

        // Fallback mapping/syncing before updating
        if (isset($data['thumbnail_url'])) {
            $data['cover_image_url'] = $data['cover_image_url'] ?? $data['thumbnail_url'];
        }
        if (isset($data['cover_image_url'])) {
            $data['thumbnail_url'] = $data['thumbnail_url'] ?? $data['cover_image_url'];
        }
        if (isset($data['technologies'])) {
            $data['tags'] = $data['tags'] ?? $data['technologies'];
        }
        if (isset($data['tags'])) {
            $data['technologies'] = $data['technologies'] ?? $data['tags'];
        }

        $project->update($data);
        Cache::flush();
        return response()->json($project);
    }

    public function destroy(string $id): JsonResponse
    {
        PortfolioProject::findOrFail($id)->delete();
        Cache::flush();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'         => 'required|array',
            'ids.*'       => 'exists:portfolio_projects,id',
            'is_published'=> 'nullable|boolean',
            'sort_order'  => 'nullable|integer',
        ]);
        PortfolioProject::whereIn('id', $data['ids'])->update(
            collect($data)->except('ids')->filter()->toArray()
        );
        Cache::flush();
        return response()->json(['message' => 'Updated successfully.']);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'string']);
        PortfolioProject::whereIn('id', $data['ids'])->delete();
        Cache::flush();
        return response()->json(['message' => 'Deleted successfully.']);
    }
}
