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
        if (Schema::hasColumn('ats_jobs', 'salary_period')) {
            return;
        }
        Schema::table('ats_jobs', function (Blueprint $table) {
            $table->string('salary_period', 20)->nullable()->after('salary_currency');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ats_jobs', function (Blueprint $table) {
            $table->dropColumn('salary_period');
        });
    }
};
