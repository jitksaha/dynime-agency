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
        if (Schema::hasTable('ats_jobs')) {
            return;
        }

        Schema::create('ats_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('flowmingo_job_id')->unique();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('department')->index();
            $table->string('employment_type');
            $table->string('location');
            $table->decimal('salary_min', 15, 2)->nullable();
            $table->decimal('salary_max', 15, 2)->nullable();
            $table->string('salary_currency', 10)->nullable();
            $table->string('salary_period', 20)->nullable();
            $table->text('description')->nullable();
            $table->json('responsibilities')->nullable();
            $table->json('requirements')->nullable();
            $table->json('benefits')->nullable();
            $table->string('experience')->nullable();
            $table->boolean('remote')->default(false)->index();
            $table->boolean('featured')->default(false)->index();
            $table->string('status')->default('open')->index();
            $table->string('apply_url');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ats_jobs');
    }
};
