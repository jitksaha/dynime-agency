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
                'cover_image_url', 'gallery_images', 'client_name',
                'project_url', 'tags', 'is_featured', 'completed_at',
            ])->get();
        });
        return response()->json($projects);
    }

    public function show(string $slug): JsonResponse
    {
        $project = Cache::remember('portfolio_' . $slug, 3600, fn() =>
            PortfolioProject::where('slug', $slug)->where('is_published', true)->firstOrFail()
        );
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
        return response()->json(PortfolioProject::orderBy('sort_order')->orderByDesc('created_at')->get());
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
            'gallery_images'  => 'nullable|array',
            'client_name'     => 'nullable|string|max:255',
            'project_url'     => 'nullable|url|max:500',
            'tags'            => 'nullable|array',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'completed_at'    => 'nullable|date',
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);
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
            'gallery_images'  => 'nullable|array',
            'client_name'     => 'nullable|string|max:255',
            'project_url'     => 'nullable|url|max:500',
            'tags'            => 'nullable|array',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'completed_at'    => 'nullable|date',
        ]);
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
