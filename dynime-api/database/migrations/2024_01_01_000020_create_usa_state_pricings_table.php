<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('usa_state_pricings')) return;
        Schema::create('usa_state_pricings', function (Blueprint $table) {
            $table->id();
            $table->string('state');
            $table->string('abbr')->unique();
            $table->decimal('llc_formation', 10, 2)->default(0.00);
            $table->decimal('corp_formation', 10, 2)->default(0.00);
            $table->decimal('llc_annual', 10, 2)->default(0.00);
            $table->string('llc_annual_label')->default('$0');
            $table->decimal('corp_annual', 10, 2)->default(0.00);
            $table->string('corp_annual_label')->default('$0');
            $table->decimal('llc_renewal', 10, 2)->default(0.00);
            $table->decimal('corp_renewal', 10, 2)->default(0.00);
            $table->text('state_tax_note')->nullable();
            $table->string('franchise_tax', 100)->default('No');
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('usa_state_pricings'); }
};
