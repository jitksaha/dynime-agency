<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('notification_settings')) return;
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('key')->unique();
            $table->json('value')->nullable();
            $table->timestamps();
            $table->index('key');
        });
    }
    public function down(): void {
        Schema::dropIfExists('notification_settings');
    }
};
