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
        if (!Schema::hasTable('crm_leads')) {
            return;
        }
        Schema::table('crm_leads', function (Blueprint $table) {
            $table->string('zoho_id')->nullable()->after('hubspot_contact_id');
            $table->string('zoho_sync_status', 50)->default('pending')->after('zoho_id');
            $table->text('zoho_sync_error')->nullable()->after('zoho_sync_status');
            $table->timestamp('last_sync_attempt_at')->nullable()->after('zoho_sync_error');
            $table->string('assigned_rep')->nullable()->after('last_sync_attempt_at');

            // Add index for lookup optimization
            $table->index('zoho_id', 'idx_crm_leads_zoho_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('crm_leads')) {
            return;
        }
        Schema::table('crm_leads', function (Blueprint $table) {
            $table->dropIndex('idx_crm_leads_zoho_id');
            $table->dropColumn([
                'zoho_id',
                'zoho_sync_status',
                'zoho_sync_error',
                'last_sync_attempt_at',
                'assigned_rep'
            ]);
        });
    }
};
