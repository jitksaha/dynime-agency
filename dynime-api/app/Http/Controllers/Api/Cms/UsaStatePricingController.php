<?php

namespace App\Http\Controllers\Api\Cms;

use App\Http\Controllers\Controller;
use App\Models\UsaStatePricing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsaStatePricingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = UsaStatePricing::orderBy('sort_order')->orderBy('state');
        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }
        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'state' => 'required|string|max:255',
            'abbr' => 'required|string|max:10',
            'llc_formation' => 'nullable|numeric',
            'corp_formation' => 'nullable|numeric',
            'llc_annual' => 'nullable|numeric',
            'llc_annual_label' => 'nullable|string|max:255',
            'corp_annual' => 'nullable|numeric',
            'corp_annual_label' => 'nullable|string|max:255',
            'llc_renewal' => 'nullable|numeric',
            'corp_renewal' => 'nullable|numeric',
            'state_tax_note' => 'nullable|string',
            'franchise_tax' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $row = UsaStatePricing::updateOrCreate(
            ['abbr' => $data['abbr']],
            $data
        );

        return response()->json($row);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $row = UsaStatePricing::where('id', $id)->orWhere('abbr', $id)->firstOrFail();
        
        $data = $request->validate([
            'state' => 'nullable|string|max:255',
            'abbr' => 'nullable|string|max:10',
            'llc_formation' => 'nullable|numeric',
            'corp_formation' => 'nullable|numeric',
            'llc_annual' => 'nullable|numeric',
            'llc_annual_label' => 'nullable|string|max:255',
            'corp_annual' => 'nullable|numeric',
            'corp_annual_label' => 'nullable|string|max:255',
            'llc_renewal' => 'nullable|numeric',
            'corp_renewal' => 'nullable|numeric',
            'state_tax_note' => 'nullable|string',
            'franchise_tax' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $row->update($data);

        return response()->json($row);
    }

    public function destroy($id): JsonResponse
    {
        $row = UsaStatePricing::where('id', $id)->orWhere('abbr', $id)->firstOrFail();
        $row->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
