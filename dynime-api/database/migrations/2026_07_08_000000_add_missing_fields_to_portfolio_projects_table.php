<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('portfolio_projects', function (Blueprint $table) {
            if (!Schema::hasColumn('portfolio_projects', 'cover_image_url')) {
                $table->string('cover_image_url', 500)->nullable()->after('description');
            }
            if (!Schema::hasColumn('portfolio_projects', 'gallery_images')) {
                $table->json('gallery_images')->nullable()->after('cover_image_url');
            }
            if (!Schema::hasColumn('portfolio_projects', 'tags')) {
                $table->json('tags')->nullable()->after('project_url');
            }
            if (!Schema::hasColumn('portfolio_projects', 'thumbnail_url')) {
                $table->string('thumbnail_url', 500)->nullable()->after('cover_image_url');
            }
            if (!Schema::hasColumn('portfolio_projects', 'thumbnail_path')) {
                $table->string('thumbnail_path', 500)->nullable()->after('thumbnail_url');
            }
            if (!Schema::hasColumn('portfolio_projects', 'alt_text')) {
                $table->string('alt_text', 1000)->nullable()->after('thumbnail_path');
            }
            if (!Schema::hasColumn('portfolio_projects', 'technologies')) {
                $table->json('technologies')->nullable()->after('tags');
            }
            if (!Schema::hasColumn('portfolio_projects', 'content_html')) {
                $table->longText('content_html')->nullable()->after('description');
            }
            if (!Schema::hasColumn('portfolio_projects', 'completed_at')) {
                $table->date('completed_at')->nullable()->after('sort_order');
            }
        });
    }

    public function down(): void {
        Schema::table('portfolio_projects', function (Blueprint $table) {
            // Self-contained schema updates, no drop needed
        });
    }
};
