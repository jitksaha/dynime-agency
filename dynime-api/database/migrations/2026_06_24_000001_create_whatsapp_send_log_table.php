<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('whatsapp_send_log')) return;
        Schema::create('whatsapp_send_log', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('message_id')->nullable();
            $table->string('template_name');
            $table->string('recipient_phone');
            $table->string('status');
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->index('created_at');
            $table->index('message_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('whatsapp_send_log');
    }
};
