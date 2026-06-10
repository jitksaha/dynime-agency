<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('flexpay_settings')) return;
        Schema::create('flexpay_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->boolean('emi_enabled')->default(true);
            $table->boolean('paylater_enabled')->default(true);
            $table->boolean('credit_system_enabled')->default(true);
            $table->json('allowed_tenures')->nullable();
            $table->json('paylater_terms')->nullable();
            $table->decimal('processing_fee_percent', 5, 2)->default(3.00);
            $table->decimal('down_payment_percent', 5, 2)->default(0.00);
            $table->decimal('late_fee_amount', 10, 2)->default(15.00);
            $table->decimal('min_order_amount', 12, 2)->default(500.00);
            $table->decimal('max_credit_limit', 12, 2)->default(10000.00);
            $table->string('default_currency', 10)->default('USD');
            $table->string('kyc_provider', 50)->default('manual');
            $table->boolean('auto_approval_enabled')->default(false);
            $table->decimal('auto_approval_max_limit', 12, 2)->default(1000.00);
            $table->json('tenure_fee_tiers')->nullable();
            $table->string('card_bin_prefix', 10)->default('545872');
            $table->integer('card_length')->default(16);
            $table->integer('card_expiry_months')->default(36);
            $table->integer('card_cvv_length')->default(3);
            $table->integer('card_max_cvv_regens')->default(3);
            $table->boolean('card_auto_issue')->default(true);
            $table->decimal('card_default_daily_limit', 12, 2)->default(1500.00);
            $table->decimal('card_default_weekly_limit', 12, 2)->default(5000.00);
            $table->decimal('card_default_monthly_limit', 12, 2)->default(15000.00);
            $table->decimal('card_default_per_txn_limit', 12, 2)->default(2500.00);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('flexpay_settings'); }
};
