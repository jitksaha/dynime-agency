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
            if (!Schema::hasColumn('job_applications', 'source')) {
                $table->string('source', 100)->default('career-page')->after('cover_letter');
            } else {
                // If it already exists, ensure it has the default value set
                $table->string('source', 100)->default('career-page')->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            if (Schema::hasColumn('job_applications', 'source')) {
                $table->dropColumn('source');
            }
        });
    }
};
