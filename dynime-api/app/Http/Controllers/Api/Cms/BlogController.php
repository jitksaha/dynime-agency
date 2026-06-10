<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    // ── Public ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'blog_posts_' . md5(json_encode($request->only(['category', 'tag', 'featured', 'limit'])));

        $posts = Cache::remember($cacheKey, 3600, function () use ($request) {
            $query = BlogPost::published();

            if ($request->category) {
                $query->where('category', $request->category);
            }
            if ($request->tag) {
                $query->whereJsonContains('tags', $request->tag);
            }
            if ($request->boolean('featured')) {
                $query->featured();
            }

            return $query->select([
                'id', 'slug', 'title', 'excerpt', 'cover_image_url',
                'category', 'tags', 'author', 'read_minutes',
                'is_featured', 'view_count', 'published_at',
            ])->limit($request->integer('limit', 100))->get();
        });

        return response()->json($posts);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Cache::remember('blog_post_' . $slug, 3600, function () use ($slug) {
            return BlogPost::where('slug', $slug)->where('is_published', true)->firstOrFail();
        });

        return response()->json($post);
    }

    public function recordView(int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $post->incrementView();
        Cache::forget('blog_post_' . $post->slug);
        return response()->json(['view_count' => $post->view_count]);
    }

    public function categories(): JsonResponse
    {
        $categories = Cache::remember('blog_categories', 3600, function () {
            return BlogPost::published()
                ->select('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category');
        });
        return response()->json($categories);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public function adminIndex(): JsonResponse
    {
        $posts = BlogPost::orderByDesc('created_at')->get();
        return response()->json($posts);
    }

    public function adminShow(int $id): JsonResponse
    {
        return response()->json(BlogPost::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:500',
            'slug'            => 'nullable|string|max:255',
            'excerpt'         => 'nullable|string',
            'content'         => 'nullable|string',
            'cover_image_url' => 'nullable|url|max:500',
            'category'        => 'nullable|string|max:100',
            'tags'            => 'nullable|array',
            'author'          => 'nullable|string|max:255',
            'read_minutes'    => 'nullable|integer|min:1|max:120',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'published_at'    => 'nullable|date',
            'meta_title'      => 'nullable|string|max:255',
            'meta_desc'       => 'nullable|string',
            'og_image'        => 'nullable|url|max:500',
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);

        $post = BlogPost::create($data);
        $this->clearCache();

        return response()->json($post, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $data = $request->validate([
            'title'           => 'sometimes|string|max:500',
            'slug'            => 'sometimes|string|max:255',
            'excerpt'         => 'nullable|string',
            'content'         => 'nullable|string',
            'cover_image_url' => 'nullable|url|max:500',
            'category'        => 'nullable|string|max:100',
            'tags'            => 'nullable|array',
            'author'          => 'nullable|string|max:255',
            'read_minutes'    => 'nullable|integer|min:1',
            'is_published'    => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'sort_order'      => 'nullable|integer',
            'published_at'    => 'nullable|date',
            'meta_title'      => 'nullable|string|max:255',
            'meta_desc'       => 'nullable|string',
            'og_image'        => 'nullable|url|max:500',
        ]);

        $post->update($data);
        $this->clearCache($post->slug);

        return response()->json($post);
    }

    public function destroy(int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $this->clearCache($post->slug);
        $post->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    private function clearCache(?string $slug = null): void
    {
        Cache::flush(); // Simple approach: flush all file cache on write
        // For production, use tagged cache or selective key patterns
    }
}
