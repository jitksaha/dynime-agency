<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('blog_posts')) return;
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title', 500);
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();
            $table->string('cover_image_url', 500)->nullable();
            $table->string('category', 100)->default('General');
            $table->json('tags')->nullable();
            $table->string('author')->default('Dynime Team');
            $table->tinyInteger('read_minutes')->default(5);
            $table->boolean('is_published')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->integer('view_count')->default(0);
            $table->timestamp('published_at')->useCurrent();
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_desc')->nullable();
            $table->string('og_image', 500)->nullable();
            $table->timestamps();
            $table->index('slug');
            $table->index('category');
        });
    }
    public function down(): void { Schema::dropIfExists('blog_posts'); }
};
