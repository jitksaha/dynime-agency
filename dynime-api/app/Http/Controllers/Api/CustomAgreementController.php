<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomAgreement;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomAgreementController extends Controller
{
    public function index(): JsonResponse
    {
        $agreements = CustomAgreement::orderBy('created_at', 'desc')->get();
        return response()->json($agreements);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'                => 'required|string|max:255',
            'document_type'        => 'nullable|string|in:agreement,quotation',
            'reference'            => 'nullable|string|max:100',
            'effective_date'       => 'required|date_format:Y-m-d',
            'client_name'          => 'required|string|max:255',
            'client_email'         => 'nullable|email|max:255',
            'client_company'       => 'nullable|string|max:255',
            'client_phone'         => 'nullable|string|max:50',
            'scope'                => 'nullable|string',
            'term'                 => 'nullable|string',
            'payment_terms'        => 'nullable|string',
            'jurisdiction'         => 'nullable|string|max:255',
            'currency'             => 'nullable|string|max:10',
            'total'                => 'nullable|numeric',
            'clauses'              => 'nullable|array',
            'items'                => 'nullable|array',
            'provider_signer'      => 'nullable|string|max:255',
            'provider_signed_date' => 'nullable|date_format:Y-m-d',
            'client_signer'        => 'nullable|string|max:255',
            'client_signed_date'   => 'nullable|date_format:Y-m-d',
        ]);

        $data['created_by'] = $request->user()?->email ?? 'admin';

        $agreement = CustomAgreement::create($data);

        return response()->json($agreement, 201);
    }

    public function show(string $id): JsonResponse
    {
        $agreement = CustomAgreement::findOrFail($id);
        return response()->json($agreement);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $agreement = CustomAgreement::findOrFail($id);

        $data = $request->validate([
            'title'                => 'required|string|max:255',
            'document_type'        => 'nullable|string|in:agreement,quotation',
            'reference'            => 'nullable|string|max:100',
            'effective_date'       => 'required|date_format:Y-m-d',
            'client_name'          => 'required|string|max:255',
            'client_email'         => 'nullable|email|max:255',
            'client_company'       => 'nullable|string|max:255',
            'client_phone'         => 'nullable|string|max:50',
            'scope'                => 'nullable|string',
            'term'                 => 'nullable|string',
            'payment_terms'        => 'nullable|string',
            'jurisdiction'         => 'nullable|string|max:255',
            'currency'             => 'nullable|string|max:10',
            'total'                => 'nullable|numeric',
            'clauses'              => 'nullable|array',
            'items'                => 'nullable|array',
            'provider_signer'      => 'nullable|string|max:255',
            'provider_signed_date' => 'nullable|date_format:Y-m-d',
            'client_signer'        => 'nullable|string|max:255',
            'client_signed_date'   => 'nullable|date_format:Y-m-d',
        ]);

        $agreement->update($data);

        return response()->json($agreement);
    }

    public function destroy(string $id): JsonResponse
    {
        $agreement = CustomAgreement::findOrFail($id);
        $agreement->delete();
        return response()->json(['success' => true]);
    }
}

