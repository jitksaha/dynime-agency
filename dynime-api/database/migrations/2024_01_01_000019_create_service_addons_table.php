<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('service_addons')) return;
        Schema::create('service_addons', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('service_slug');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price_usd', 10, 2)->default(0.00);
            $table->string('period', 50)->default('one-time');
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->index(['service_slug', 'sort_order']);
        });
    }
    public function down(): void { Schema::dropIfExists('service_addons'); }
};
