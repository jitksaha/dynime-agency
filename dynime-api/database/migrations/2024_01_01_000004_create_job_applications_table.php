<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('job_applications')) return;
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('career_id')->nullable();
            $table->string('career_slug', 255)->nullable();
            $table->string('full_name');
            $table->string('email');
            $table->string('phone', 50)->nullable();
            $table->text('cover_letter')->nullable();
            $table->string('resume_path', 500)->nullable();
            $table->string('resume_filename', 255)->nullable();
            $table->enum('status', ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'])->default('new');
            $table->text('admin_notes')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->timestamps();
            $table->index('career_id');
            $table->index('status');
        });
    }
    public function down(): void { Schema::dropIfExists('job_applications'); }
};
