<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('media_files')) return;
        Schema::create('media_files', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('original_name');
            $table->string('path', 500);
            $table->string('url', 500);
            $table->string('mime_type', 100);
            $table->bigInteger('size')->unsigned();
            $table->string('disk', 50)->default('public');
            $table->string('alt_text', 500)->nullable();
            $table->string('folder', 255)->default('uploads');
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
            $table->index('folder');
            $table->index('mime_type');
        });
    }
    public function down(): void { Schema::dropIfExists('media_files'); }
};
