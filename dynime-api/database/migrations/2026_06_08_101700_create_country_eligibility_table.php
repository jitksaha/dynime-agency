<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('country_eligibility', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->json('aliases')->nullable();
            $table->enum('status', ['blocked', 'review', 'eligible'])->default('eligible');
            $table->string('category', 100)->default('Eligible');
            $table->text('reason')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('status');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('country_eligibility');
    }
};
