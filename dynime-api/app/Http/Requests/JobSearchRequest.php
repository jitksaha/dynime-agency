<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JobSearchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'search' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'employment_type' => 'nullable|string|max:255',
            'featured' => 'nullable|string|in:true,false,1,0',
            'remote' => 'nullable|string|in:true,false,1,0',
            'sort_by' => 'nullable|string|in:title,department,published_at,salary_max',
            'sort_dir' => 'nullable|string|in:asc,desc,ASC,DESC',
            'per_page' => 'nullable|integer|min:1|max:100',
        ];
    }
}
