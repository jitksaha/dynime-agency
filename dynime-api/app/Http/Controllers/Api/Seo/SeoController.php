<?php

namespace App\Http\Controllers\Api\Seo;

use App\Http\Controllers\Controller;
use App\Models\SeoMeta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SeoController extends Controller
{
    public function getByPath(Request $request): JsonResponse
    {
        $path = '/' . ltrim($request->query('path', '/'), '/');
        $seo  = Cache::remember('seo_' . md5($path), 86400, fn() =>
            SeoMeta::where('path', $path)->where('is_active', true)->first()
        );
        return response()->json($seo ?? (object)[]);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json(SeoMeta::orderBy('path')->get());
    }

    public function adminShow(string $id): JsonResponse
    {
        return response()->json(SeoMeta::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path'           => 'required|string|max:500',
            'entity_type'    => 'nullable|string|max:100',
            'entity_id'      => 'nullable|integer',
            'meta_title'     => 'nullable|string|max:255',
            'meta_desc'      => 'nullable|string',
            'og_title'       => 'nullable|string|max:255',
            'og_description' => 'nullable|string',
            'og_image'       => 'nullable|url|max:500',
            'twitter_title'  => 'nullable|string|max:255',
            'twitter_desc'   => 'nullable|string',
            'twitter_image'  => 'nullable|url|max:500',
            'canonical_url'  => 'nullable|url|max:500',
            'schema_json'    => 'nullable|array',
            'robots'         => 'nullable|string|max:100',
            'is_active'      => 'nullable|boolean',
        ]);

        $seo = SeoMeta::updateOrCreate(['path' => $data['path']], $data);
        Cache::forget('seo_' . md5($data['path']));
        return response()->json($seo, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);
        $data = $request->validate([
            'path'           => 'sometimes|string|max:500',
            'meta_title'     => 'nullable|string|max:255',
            'meta_desc'      => 'nullable|string',
            'og_title'       => 'nullable|string|max:255',
            'og_description' => 'nullable|string',
            'og_image'       => 'nullable|url|max:500',
            'twitter_title'  => 'nullable|string|max:255',
            'twitter_desc'   => 'nullable|string',
            'twitter_image'  => 'nullable|url|max:500',
            'canonical_url'  => 'nullable|url|max:500',
            'schema_json'    => 'nullable|array',
            'robots'         => 'nullable|string|max:100',
            'is_active'      => 'nullable|boolean',
        ]);
        $seo->update($data);
        Cache::forget('seo_' . md5($seo->path));
        return response()->json($seo);
    }

    public function destroy(string $id): JsonResponse
    {
        $seo = SeoMeta::findOrFail($id);
        Cache::forget('seo_' . md5($seo->path));
        $seo->delete();
        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function sitemap(): \Illuminate\Http\Response
    {
        $xml = Cache::remember('sitemap_xml', 86400, function () {
            $posts    = \App\Models\BlogPost::published()->select('slug', 'updated_at')->get();
            $careers  = \App\Models\Career::active()->select('slug', 'updated_at')->get();
            $projects = \App\Models\PortfolioProject::published()->select('slug', 'updated_at')->get();
            $services = \App\Models\Service::active()->select('slug', 'updated_at')->get();

            $base = rtrim(config('app.frontend_url', config('app.url')), '/');

            $urls  = "<url><loc>{$base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n";
            $urls .= "<url><loc>{$base}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n";
            $urls .= "<url><loc>{$base}/services</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n";
            $urls .= "<url><loc>{$base}/portfolio</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n";
            $urls .= "<url><loc>{$base}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n";
            $urls .= "<url><loc>{$base}/careers</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n";
            $urls .= "<url><loc>{$base}/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n";

            foreach ($posts as $post) {
                $urls .= "<url><loc>{$base}/blog/{$post->slug}</loc><lastmod>{$post->updated_at->toDateString()}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n";
            }
            foreach ($careers as $career) {
                $urls .= "<url><loc>{$base}/careers/{$career->slug}</loc><lastmod>{$career->updated_at->toDateString()}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n";
            }
            foreach ($projects as $project) {
                $urls .= "<url><loc>{$base}/portfolio/{$project->slug}</loc><lastmod>{$project->updated_at->toDateString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n";
            }
            foreach ($services as $service) {
                $urls .= "<url><loc>{$base}/services/{$service->slug}</loc><lastmod>{$service->updated_at->toDateString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n";
            }

            return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
                . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n"
                . $urls
                . '</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }
}
