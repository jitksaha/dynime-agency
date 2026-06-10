<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('portfolio_projects')) return;
        Schema::create('portfolio_projects', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->string('slug', 255)->unique()->nullable();
            $table->string('category', 100)->default('General');
            $table->text('description')->nullable();
            $table->longText('content_html')->nullable();
            $table->string('cover_image_url', 500)->nullable();
            $table->json('gallery_images')->nullable();
            $table->string('client_name', 255)->nullable();
            $table->string('project_url', 500)->nullable();
            $table->json('tags')->nullable();
            $table->boolean('is_published')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->date('completed_at')->nullable();
            $table->timestamps();
            $table->index('category');
            $table->index('is_published');
        });
    }
    public function down(): void { Schema::dropIfExists('portfolio_projects'); }
};
