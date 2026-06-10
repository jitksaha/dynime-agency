<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('services')) return;
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title', 500);
            $table->string('category', 100)->nullable();
            $table->text('excerpt')->nullable();
            $table->longText('description')->nullable();
            $table->string('icon', 100)->nullable();
            $table->string('cover_image_url', 500)->nullable();
            $table->json('features')->nullable();
            $table->json('pricing')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_desc')->nullable();
            $table->timestamps();
            $table->index('slug');
            $table->index('is_active');
        });
    }
    public function down(): void { Schema::dropIfExists('services'); }
};
