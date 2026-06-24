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
        if (!Schema::hasTable('verification_requests')) {
            Schema::create('verification_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type', 50);
                $table->uuid('customer_id')->nullable();
                $table->uuid('company_id')->nullable();
                $table->string('service_order_id', 36)->nullable();
                $table->string('compliance_case_id', 255)->nullable();
                $table->string('didit_session_id', 255)->nullable()->unique();
                $table->string('workflow_id', 255)->nullable();
                $table->text('verification_url')->nullable();
                $table->text('qr_code_url')->nullable();
                $table->string('status', 50)->default('pending');
                $table->string('decision', 50)->nullable();
                $table->string('company_name', 255)->nullable();
                $table->string('country', 255)->nullable();
                $table->string('customer_name', 255)->nullable();
                $table->string('customer_email', 255)->nullable();
                $table->timestamps();

                $table->index('customer_id');
                $table->index('company_id');
                $table->index('service_order_id');
                $table->index('didit_session_id');
            });
        }

        if (!Schema::hasTable('verification_events')) {
            Schema::create('verification_events', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('verification_request_id');
                $table->string('webhook_type', 255);
                $table->json('payload');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('verification_request_id')
                    ->references('id')
                    ->on('verification_requests')
                    ->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('verification_logs')) {
            Schema::create('verification_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('verification_request_id');
                $table->string('action', 255);
                $table->text('description');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('verification_request_id')
                    ->references('id')
                    ->on('verification_requests')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_logs');
        Schema::dropIfExists('verification_events');
        Schema::dropIfExists('verification_requests');
    }
};
