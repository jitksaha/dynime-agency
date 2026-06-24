<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('custom_agreements', function (Blueprint $table) {
            $table->string('document_type', 50)->default('agreement')->after('title');
        });
    }

    public function down(): void {
        Schema::table('custom_agreements', function (Blueprint $table) {
            $table->dropColumn('document_type');
        });
    }
};
