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
        if (!Schema::hasTable('newsletter_subscribers')) {
            Schema::create('newsletter_subscribers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('email', 255)->unique();
                $table->string('source', 100)->nullable();
                $table->string('status', 50)->default('subscribed'); // subscribed, unsubscribed
                $table->json('metadata')->nullable();
                $table->timestamp('subscribed_at')->useCurrent();
                $table->timestamp('unsubscribed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
