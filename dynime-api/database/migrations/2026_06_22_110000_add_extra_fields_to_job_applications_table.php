<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('job_applications', 'career_title')) {
                $table->string('career_title', 255)->nullable()->after('career_slug');
            }
            if (!Schema::hasColumn('job_applications', 'country')) {
                $table->string('country', 255)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('job_applications', 'current_position')) {
                $table->string('current_position', 255)->nullable()->after('country');
            }
            if (!Schema::hasColumn('job_applications', 'experience_years')) {
                $table->integer('experience_years')->nullable()->after('current_position');
            }
            if (!Schema::hasColumn('job_applications', 'expected_salary')) {
                $table->string('expected_salary', 255)->nullable()->after('experience_years');
            }
            if (!Schema::hasColumn('job_applications', 'linkedin_url')) {
                $table->string('linkedin_url', 500)->nullable()->after('expected_salary');
            }
            if (!Schema::hasColumn('job_applications', 'portfolio_url')) {
                $table->string('portfolio_url', 500)->nullable()->after('linkedin_url');
            }
            if (!Schema::hasColumn('job_applications', 'resume_path')) {
                $table->string('resume_path', 500)->nullable()->after('portfolio_url');
            }
            if (!Schema::hasColumn('job_applications', 'resume_filename')) {
                $table->string('resume_filename', 255)->nullable()->after('resume_path');
            }
            if (!Schema::hasColumn('job_applications', 'resume_url')) {
                $table->string('resume_url', 500)->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_score')) {
                $table->integer('ats_score')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_match_level')) {
                $table->string('ats_match_level', 50)->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_matched_keywords')) {
                $table->json('ats_matched_keywords')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_missing_keywords')) {
                $table->json('ats_missing_keywords')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_summary')) {
                $table->text('ats_summary')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_scanned_at')) {
                $table->timestamp('ats_scanned_at')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_resume_chars')) {
                $table->integer('ats_resume_chars')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_detected_skills')) {
                $table->json('ats_detected_skills')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_detected_titles')) {
                $table->json('ats_detected_titles')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_detected_experience_years')) {
                $table->decimal('ats_detected_experience_years', 5, 2)->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_education')) {
                $table->text('ats_education')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_red_flags')) {
                $table->json('ats_red_flags')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_recommendation')) {
                $table->text('ats_recommendation')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_contact_links')) {
                $table->json('ats_contact_links')->nullable();
            }
            if (!Schema::hasColumn('job_applications', 'ats_highlights')) {
                $table->json('ats_highlights')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn([
                'career_title', 'country', 'current_position', 'experience_years',
                'expected_salary', 'linkedin_url', 'portfolio_url', 'resume_path', 'resume_filename', 'resume_url',
                'ats_score', 'ats_match_level', 'ats_matched_keywords', 'ats_missing_keywords',
                'ats_summary', 'ats_scanned_at', 'ats_resume_chars', 'ats_detected_skills',
                'ats_detected_titles', 'ats_detected_experience_years', 'ats_education',
                'ats_red_flags', 'ats_recommendation', 'ats_contact_links', 'ats_highlights'
            ]);
        });
    }
};
