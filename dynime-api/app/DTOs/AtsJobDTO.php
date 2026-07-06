<?php

namespace App\DTOs;

class AtsJobDTO
{
    /**
     * @param array<int, string>|null $responsibilities
     * @param array<int, string>|null $requirements
     * @param array<int, string>|null $benefits
     */
    public function __construct(
        public string $flowmingo_job_id,
        public string $title,
        public string $slug,
        public string $department,
        public string $employment_type,
        public string $location,
        public ?float $salary_min,
        public ?float $salary_max,
        public ?string $salary_currency,
        public ?string $salary_period,
        public ?string $description,
        public ?array $responsibilities,
        public ?array $requirements,
        public ?array $benefits,
        public ?string $experience,
        public bool $remote,
        public bool $featured,
        public string $status,
        public string $apply_url,
        public ?string $published_at
    ) {}

    /**
     * Create a DTO from an array (e.g. from API response).
     *
     * @param array<string, mixed> $data
     * @return self
     */
    public static function fromArray(array $data): self
    {
        return new self(
            flowmingo_job_id: (string) ($data['id'] ?? $data['flowmingo_job_id'] ?? ''),
            title: (string) ($data['title'] ?? ''),
            slug: (string) ($data['slug'] ?? ''),
            department: (string) ($data['department'] ?? 'General'),
            employment_type: (string) ($data['employment_type'] ?? 'Full-time'),
            location: (string) ($data['location'] ?? 'Remote'),
            salary_min: isset($data['salary_min']) ? (float) $data['salary_min'] : null,
            salary_max: isset($data['salary_max']) ? (float) $data['salary_max'] : null,
            salary_currency: $data['salary_currency'] ?? null,
            salary_period: $data['salary_period'] ?? null,
            description: $data['description'] ?? null,
            responsibilities: is_array($data['responsibilities'] ?? null) ? $data['responsibilities'] : null,
            requirements: is_array($data['requirements'] ?? null) ? $data['requirements'] : null,
            benefits: is_array($data['benefits'] ?? null) ? $data['benefits'] : null,
            experience: $data['experience'] ?? null,
            remote: (bool) ($data['remote'] ?? false),
            featured: (bool) ($data['featured'] ?? false),
            status: (string) ($data['status'] ?? 'open'),
            apply_url: (string) ($data['apply_url'] ?? ''),
            published_at: $data['published_at'] ?? null
        );
    }

    /**
     * Convert the DTO to an array suitable for database insert/update.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'flowmingo_job_id' => $this->flowmingo_job_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'department' => $this->department,
            'employment_type' => $this->employment_type,
            'location' => $this->location,
            'salary_min' => $this->salary_min,
            'salary_max' => $this->salary_max,
            'salary_currency' => $this->salary_currency,
            'salary_period' => $this->salary_period,
            'description' => $this->description,
            'responsibilities' => $this->responsibilities,
            'requirements' => $this->requirements,
            'benefits' => $this->benefits,
            'experience' => $this->experience,
            'remote' => $this->remote,
            'featured' => $this->featured,
            'status' => $this->status,
            'apply_url' => $this->apply_url,
            'published_at' => $this->published_at,
        ];
    }
}
