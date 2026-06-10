<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TeamController extends Controller
{
    public function index(): JsonResponse
    {
        $team = Cache::remember('team_members_active', 3600, fn() =>
            TeamMember::active()->select([
                'id', 'name', 'role', 'department', 'bio',
                'photo_url', 'linkedin_url', 'twitter_url', 'is_featured',
            ])->get()
        );
        return response()->json($team);
    }

    public function adminIndex(): JsonResponse
    {
        return response()->json(TeamMember::orderBy('sort_order')->orderByDesc('created_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'role'         => 'required|string|max:255',
            'department'   => 'nullable|string|max:100',
            'bio'          => 'nullable|string',
            'photo_url'    => 'nullable|url|max:500',
            'linkedin_url' => 'nullable|url|max:500',
            'twitter_url'  => 'nullable|url|max:500',
            'email'        => 'nullable|email|max:255',
            'sort_order'   => 'nullable|integer',
            'is_active'    => 'nullable|boolean',
            'is_featured'  => 'nullable|boolean',
        ]);
        $member = TeamMember::create($data);
        Cache::flush();
        return response()->json($member, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $member = TeamMember::findOrFail($id);
        $data = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'role'         => 'sometimes|string|max:255',
            'department'   => 'nullable|string|max:100',
            'bio'          => 'nullable|string',
            'photo_url'    => 'nullable|url|max:500',
            'linkedin_url' => 'nullable|url|max:500',
            'twitter_url'  => 'nullable|url|max:500',
            'email'        => 'nullable|email|max:255',
            'sort_order'   => 'nullable|integer',
            'is_active'    => 'nullable|boolean',
            'is_featured'  => 'nullable|boolean',
        ]);
        $member->update($data);
        Cache::flush();
        return response()->json($member);
    }

    public function destroy(int $id): JsonResponse
    {
        TeamMember::findOrFail($id)->delete();
        Cache::flush();
        return response()->json(['message' => 'Deleted successfully.']);
    }
}
