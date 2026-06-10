<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('page_analytics')) return;
        Schema::create('page_analytics', function (Blueprint $table) {
            $table->id();
            $table->string('path', 500);
            $table->string('entity_type', 100)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('referer', 500)->nullable();
            $table->string('country', 100)->nullable();
            $table->timestamps();
            $table->index('path');
            $table->index('created_at');
        });
    }
    public function down(): void { Schema::dropIfExists('page_analytics'); }
};
