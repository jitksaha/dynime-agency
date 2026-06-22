<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasDynamicIdType;

class JobApplication extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'career_id', 'career_slug', 'career_title', 'full_name', 'email', 'phone',
        'country', 'current_position', 'experience_years', 'expected_salary',
        'linkedin_url', 'portfolio_url', 'resume_path', 'resume_filename',
        'resume_url', 'cover_letter', 'status', 'admin_notes', 'metadata', 'ip_address',
        'source', 'ats_score', 'ats_match_level', 'ats_matched_keywords', 'ats_missing_keywords',
        'ats_summary', 'ats_scanned_at', 'ats_resume_chars', 'ats_detected_skills',
        'ats_detected_titles', 'ats_detected_experience_years', 'ats_education',
        'ats_red_flags', 'ats_recommendation', 'ats_contact_links', 'ats_highlights',
    ];

    protected $attributes = [
        'status' => 'new',
    ];

    protected function casts(): array {
        return [
            'metadata' => 'array',
            'ats_matched_keywords' => 'array',
            'ats_missing_keywords' => 'array',
            'ats_detected_skills' => 'array',
            'ats_detected_titles' => 'array',
            'ats_red_flags' => 'array',
            'ats_contact_links' => 'array',
            'ats_highlights' => 'array',
            'ats_scanned_at' => 'datetime',
        ];
    }



    public function career(): BelongsTo {
        return $this->belongsTo(Career::class);
    }
}
