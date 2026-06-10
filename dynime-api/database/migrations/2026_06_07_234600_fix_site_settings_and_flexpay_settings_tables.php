<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop and recreate site_settings to fix the varchar(36) non-auto-incrementing ID issue
        Schema::dropIfExists('site_settings');
        
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

        Schema::table('flexpay_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('flexpay_settings', 'created_at')) {
                $table->timestamp('created_at')->nullable()->after('updated_at');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
