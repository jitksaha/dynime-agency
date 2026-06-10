<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('site_settings')) return;
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->string('group', 100)->default('general');
            $table->string('label', 255)->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamps();
            $table->index('key');
            $table->index('group');
        });
    }
    public function down(): void { Schema::dropIfExists('site_settings'); }
};
