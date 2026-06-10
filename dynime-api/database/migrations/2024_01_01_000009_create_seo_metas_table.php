<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('seo_metas')) return;
        Schema::create('seo_metas', function (Blueprint $table) {
            $table->id();
            $table->string('path', 500)->unique();
            $table->string('entity_type', 100)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_desc')->nullable();
            $table->string('og_title', 255)->nullable();
            $table->text('og_description')->nullable();
            $table->string('og_image', 500)->nullable();
            $table->string('twitter_title', 255)->nullable();
            $table->text('twitter_desc')->nullable();
            $table->string('twitter_image', 500)->nullable();
            $table->string('canonical_url', 500)->nullable();
            $table->json('schema_json')->nullable();
            $table->string('robots', 100)->default('index,follow');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('path');
        });
    }
    public function down(): void { Schema::dropIfExists('seo_metas'); }
};
