<?php
 
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('custom_agreements')) return;
        Schema::create('custom_agreements', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('title');
            $table->string('reference')->nullable();
            $table->date('effective_date');
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_company')->nullable();
            $table->string('client_phone')->nullable();
            $table->text('scope')->nullable();
            $table->text('term')->nullable();
            $table->text('payment_terms')->nullable();
            $table->string('jurisdiction')->nullable();
            $table->string('currency')->default('USD');
            $table->decimal('total', 12, 2)->default(0);
            $table->json('clauses')->nullable();
            $table->json('items')->nullable();
            $table->string('provider_signer')->nullable();
            $table->date('provider_signed_date')->nullable();
            $table->string('client_signer')->nullable();
            $table->date('client_signed_date')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();

            $table->index('client_name');
            $table->index('reference');
            $table->index('created_at');
        });
    }
    public function down(): void {
        Schema::dropIfExists('custom_agreements');
    }
};
