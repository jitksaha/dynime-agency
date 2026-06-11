<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('abandoned_checkouts')) {
            Schema::create('abandoned_checkouts', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('email', 255)->index();
                $table->string('name', 255)->nullable();
                $table->string('phone', 255)->nullable();
                $table->json('cart_data')->nullable();
                $table->json('checkout_details')->nullable();
                $table->string('status', 50)->default('abandoned');
                $table->boolean('email_sent')->default(false);
                $table->timestamp('last_active_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('abandoned_checkouts');
    }
};
