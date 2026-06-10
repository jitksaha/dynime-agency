<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('service_pricings')) return;
        Schema::create('service_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('service_slug')->unique();
            $table->string('service_title')->default('');
            $table->boolean('is_enabled')->default(true);
            $table->json('tiers')->nullable();
            $table->json('quote_settings')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('service_pricings'); }
};
