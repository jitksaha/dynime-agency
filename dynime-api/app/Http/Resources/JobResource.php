<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'flowmingo_job_id' => $this->flowmingo_job_id,
            'slug' => $this->slug,
            'title' => $this->title,
            'department' => $this->department,
            'employment_type' => $this->employment_type,
            'location' => $this->location,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'salary_currency' => $this->salary_currency,
            'salary_range' => $this->formatSalaryRange(),
            'description' => $this->description,
            'responsibilities' => $this->responsibilities ?? [],
            'requirements' => $this->requirements ?? [],
            'benefits' => $this->benefits ?? [],
            'experience' => $this->experience,
            'remote' => (bool) $this->remote,
            'featured' => (bool) $this->featured,
            'status' => $this->status,
            'apply_url' => $this->apply_url,
            'published_at' => $this->published_at ? $this->published_at->toIso8601String() : null,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
        ];
    }

    /**
     * Format salary range dynamically for frontend consumption.
     */
    protected function formatSalaryRange(): ?string
    {
        if (is_null($this->salary_min) && is_null($this->salary_max)) {
            return null;
        }

        $currency = $this->salary_currency ?: 'USD';

        if (!is_null($this->salary_min) && !is_null($this->salary_max)) {
            return sprintf(
                '%s%s - %s%s',
                $this->getCurrencySymbol($currency),
                number_format($this->salary_min, 0),
                $this->getCurrencySymbol($currency),
                number_format($this->salary_max, 0)
            );
        }

        if (!is_null($this->salary_min)) {
            return sprintf(
                'From %s%s',
                $this->getCurrencySymbol($currency),
                number_format($this->salary_min, 0)
            );
        }

        return sprintf(
            'Up to %s%s',
            $this->getCurrencySymbol($currency),
            number_format($this->salary_max, 0)
        );
    }

    protected function getCurrencySymbol(string $currency): string
    {
        return match (strtoupper($currency)) {
            'EUR' => '€',
            'GBP' => '£',
            'JPY' => '¥',
            'CAD' => 'CA$',
            'AUD' => 'A$',
            default => '$',
        };
    }
}
