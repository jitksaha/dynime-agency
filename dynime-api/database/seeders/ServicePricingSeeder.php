<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServicePricing;
use App\Models\UsaStatePricing;

class ServicePricingSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = database_path('seeders/pricing_seed.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("pricing_seed.json not found!");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        
        $this->command->info('Seeding service_pricings from JSON...');
        foreach ($data['servicePricings'] as $sp) {
            ServicePricing::updateOrCreate(
                ['service_slug' => $sp['service_slug']],
                [
                    'service_title'  => $sp['service_title'],
                    'is_enabled'     => $sp['is_enabled'],
                    'tiers'          => $sp['tiers'],
                    'quote_settings' => $sp['quote_settings'],
                ]
            );
        }
        $this->command->info('✔ Seeding service_pricings complete.');

        $this->command->info('Seeding usa_state_pricings from JSON...');
        foreach ($data['statePricings'] as $st) {
            UsaStatePricing::updateOrCreate(
                ['abbr' => $st['abbr']],
                [
                    'state'             => $st['state'],
                    'llc_formation'     => $st['llc_formation'],
                    'corp_formation'    => $st['corp_formation'],
                    'llc_annual'        => $st['llc_annual'],
                    'llc_annual_label'  => $st['llc_annual_label'],
                    'corp_annual'       => $st['corp_annual'],
                    'corp_annual_label' => $st['corp_annual_label'],
                    'llc_renewal'       => $st['llc_renewal'],
                    'corp_renewal'      => $st['corp_renewal'],
                    'franchise_tax'     => $st['franchise_tax'],
                    'notes'             => $st['notes'],
                    'sort_order'        => $st['sort_order'],
                    'is_active'         => $st['is_active'],
                ]
            );
        }
        $this->command->info('✔ Seeding usa_state_pricings complete.');
    }
}
