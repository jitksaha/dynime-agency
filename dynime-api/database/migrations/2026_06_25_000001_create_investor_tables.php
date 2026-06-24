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
        if (!Schema::hasTable('profiles')) {
            Schema::create('profiles', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('email', 255)->unique();
                $table->string('full_name', 255)->nullable();
                $table->string('avatar_url', 255)->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('investment_plans')) {
            Schema::create('investment_plans', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('slug', 255)->unique();
                $table->string('name', 255);
                $table->string('tagline', 255)->nullable();
                $table->text('description')->nullable();
                $table->decimal('min_amount', 18, 2)->default(0);
                $table->decimal('max_amount', 18, 2)->nullable();
                $table->string('currency', 10)->default('USD');
                $table->decimal('roi_percent', 7, 2)->default(0);
                $table->decimal('profit_share_percent', 7, 2)->default(0);
                $table->integer('lock_period_days')->default(0);
                $table->string('payout_frequency', 50)->default('monthly');
                $table->string('risk_level', 50)->default('moderate');
                $table->string('tier', 50)->default('standard');
                $table->decimal('capacity', 18, 2)->nullable();
                $table->decimal('allocated', 18, 2)->default(0);
                $table->text('withdrawal_policy')->nullable();
                $table->text('policy_text')->nullable();
                $table->json('highlights')->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('is_featured')->default(false);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('investments')) {
            Schema::create('investments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('investor_id');
                $table->uuid('plan_id')->nullable();
                $table->string('plan_slug', 255)->nullable();
                $table->string('plan_name', 255);
                $table->decimal('amount', 18, 2);
                $table->string('currency', 10)->default('USD');
                $table->string('status', 50)->default('pending');
                $table->string('agreement_status', 50)->default('unsigned');
                $table->string('agreement_pdf_path', 255)->nullable();
                $table->timestamp('agreement_signed_at')->nullable();
                $table->string('agreement_signed_by_name', 255)->nullable();
                $table->string('agreement_signed_ip', 50)->nullable();
                $table->decimal('monthly_return_percent', 7, 2)->nullable();
                $table->decimal('bonus_percent_biannual', 7, 2)->nullable();
                $table->integer('lock_period_months')->nullable();
                $table->string('payout_frequency', 50)->default('monthly');
                $table->timestamp('started_at')->nullable();
                $table->timestamp('principal_return_at')->nullable();
                $table->json('bank_details')->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index('investor_id');
            });
        }

        if (!Schema::hasTable('investment_payouts')) {
            Schema::create('investment_payouts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('investment_id');
                $table->uuid('investor_id');
                $table->date('period_start')->nullable();
                $table->date('period_end')->nullable();
                $table->string('payout_type', 50)->default('monthly');
                $table->decimal('amount', 18, 2)->default(0);
                $table->string('currency', 10)->default('USD');
                $table->string('status', 50)->default('scheduled');
                $table->timestamp('paid_at')->nullable();
                $table->string('statement_pdf_path', 255)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('investor_id');
            });
        }

        if (!Schema::hasTable('withdrawal_requests')) {
            Schema::create('withdrawal_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('investor_id');
                $table->uuid('investment_id')->nullable();
                $table->decimal('amount', 18, 2);
                $table->string('currency', 10)->default('USD');
                $table->string('method', 50)->default('bank_transfer');
                $table->json('bank_details')->nullable();
                $table->string('status', 50)->default('pending');
                $table->text('admin_notes')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->uuid('processed_by')->nullable();
                $table->timestamps();

                $table->index('investor_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('investment_payouts');
        Schema::dropIfExists('investments');
        Schema::dropIfExists('investment_plans');
        Schema::dropIfExists('profiles');
    }
};
