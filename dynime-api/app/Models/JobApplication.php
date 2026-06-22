<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
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

    protected static function booted()
    {
        static::creating(function ($model) {
            try {
                $type = \Illuminate\Support\Facades\Schema::getColumnType($model->getTable(), 'id');
                if (in_array($type, ['string', 'varchar', 'char'])) {
                    if (empty($model->id)) {
                        $model->id = (string) \Illuminate\Support\Str::uuid();
                    }
                }
            } catch (\Exception $e) {}
        });
    }

    public function getKeyType()
    {
        try {
            $type = \Illuminate\Support\Facades\Schema::getColumnType($this->getTable(), 'id');
            if (in_array($type, ['string', 'varchar', 'char'])) {
                return 'string';
            }
        } catch (\Exception $e) {}
        return parent::getKeyType();
    }

    public function getIncrementing()
    {
        try {
            $type = \Illuminate\Support\Facades\Schema::getColumnType($this->getTable(), 'id');
            if (in_array($type, ['string', 'varchar', 'char'])) {
                return false;
            }
        } catch (\Exception $e) {}
        return parent::getIncrementing();
    }

    public function career(): BelongsTo {
        return $this->belongsTo(Career::class);
    }
}
