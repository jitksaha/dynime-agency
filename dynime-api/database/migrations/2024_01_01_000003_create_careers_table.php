<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('careers')) return;
        Schema::create('careers', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title', 500);
            $table->string('department', 100)->default('General');
            $table->string('location', 255)->default('Remote');
            $table->string('employment_type', 100)->default('Full-time');
            $table->string('experience_level', 100)->nullable();
            $table->string('salary_range', 100)->nullable();
            $table->text('description')->nullable();
            $table->longText('content_html')->nullable();
            $table->json('responsibilities')->nullable();
            $table->json('requirements')->nullable();
            $table->string('hero_image_url', 500)->nullable();
            $table->tinyInteger('vacancies')->default(1);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->integer('view_count')->default(0);
            $table->timestamp('posted_at')->useCurrent();
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_desc')->nullable();
            $table->timestamps();
            $table->index('slug');
            $table->index('is_active');
        });
    }
    public function down(): void { Schema::dropIfExists('careers'); }
};
