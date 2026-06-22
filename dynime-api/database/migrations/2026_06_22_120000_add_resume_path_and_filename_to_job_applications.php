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
            if (!Schema::hasColumn('job_applications', 'resume_path')) {
                $table->string('resume_path', 500)->nullable()->after('portfolio_url');
            }
            if (!Schema::hasColumn('job_applications', 'resume_filename')) {
                $table->string('resume_filename', 255)->nullable()->after('resume_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn(['resume_path', 'resume_filename']);
        });
    }
};
