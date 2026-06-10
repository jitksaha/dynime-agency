<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('contact_submissions')) return;
        Schema::create('contact_submissions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['contact', 'inquiry', 'quote'])->default('contact');
            $table->string('name');
            $table->string('email');
            $table->string('phone', 50)->nullable();
            $table->string('subject', 500)->nullable();
            $table->text('message');
            $table->string('service', 255)->nullable();
            $table->enum('status', ['new', 'read', 'replied', 'archived'])->default('new');
            $table->text('admin_notes')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index('status');
            $table->index('email');
        });
    }
    public function down(): void { Schema::dropIfExists('contact_submissions'); }
};
