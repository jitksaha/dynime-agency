<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountryEligibilitySeeder extends Seeder
{
    public function run(): void
    {
        // Restricted countries — aligned with Stripe / SSLCommerz / Paddle universally-restricted lists
        $restricted = [
            'Iran'        => ['aliases' => ['Islamic Republic of Iran'], 'category' => 'OFAC Comprehensive Sanctions'],
            'North Korea' => ['aliases' => ['DPRK', 'Democratic People\'s Republic of Korea'], 'category' => 'OFAC Comprehensive Sanctions'],
            'Syria'       => ['aliases' => ['Syrian Arab Republic'], 'category' => 'OFAC Comprehensive Sanctions'],
            'Cuba'        => ['aliases' => [], 'category' => 'OFAC Comprehensive Sanctions'],
            'Russia'      => ['aliases' => ['Russian Federation'], 'category' => 'OFAC Comprehensive Sanctions'],
            'Belarus'     => ['aliases' => [], 'category' => 'OFAC Comprehensive Sanctions'],
            'Myanmar'     => ['aliases' => ['Burma'], 'category' => 'FATF Blacklist'],
            'Sudan'       => ['aliases' => [], 'category' => 'OFAC Comprehensive Sanctions'],
            'South Sudan' => ['aliases' => [], 'category' => 'Active Conflict Zone'],
            'Zimbabwe'    => ['aliases' => [], 'category' => 'Severe Payment / Digital Restrictions'],
            'Venezuela'   => ['aliases' => [], 'category' => 'Severe Payment / Digital Restrictions'],
            'Crimea'      => ['aliases' => [], 'category' => 'OFAC Comprehensive Sanctions'],
            'Donetsk'     => ['aliases' => ['Donetsk People\'s Republic'], 'category' => 'OFAC Comprehensive Sanctions'],
            'Luhansk'     => ['aliases' => ['Luhansk People\'s Republic'], 'category' => 'OFAC Comprehensive Sanctions'],
        ];

        // All countries (ISO 3166)
        $allCountries = [
            'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria',
            'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
            'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon',
            'Canada','Cape Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica',
            'Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt',
            'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon',
            'Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
            'Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
            'Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait',
            'Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
            'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico',
            'Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru',
            'Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman',
            'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
            'Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Saudi Arabia',
            'Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa',
            'South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan',
            'Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan',
            'Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City',
            'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
        ];

        // Also add special regions used in admin
        $specialRegions = ['Crimea', 'Donetsk', 'Luhansk'];

        $allEntries = array_unique(array_merge($allCountries, $specialRegions));
        sort($allEntries);

        $now = now();
        $rows = [];
        $order = 0;

        foreach ($allEntries as $name) {
            $isRestricted = array_key_exists($name, $restricted);
            $rows[] = [
                'name'       => $name,
                'aliases'    => json_encode($isRestricted ? ($restricted[$name]['aliases'] ?? []) : []),
                'status'     => $isRestricted ? 'blocked' : 'eligible',
                'category'   => $isRestricted ? $restricted[$name]['category'] : 'Eligible',
                'reason'     => $isRestricted ? 'Restricted by international sanctions or payment gateway policy.' : null,
                'is_active'  => true,
                'sort_order' => $order++,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Upsert — skip if already exists
        foreach (array_chunk($rows, 50) as $chunk) {
            foreach ($chunk as $row) {
                DB::table('country_eligibility')->updateOrInsert(
                    ['name' => $row['name']],
                    $row
                );
            }
        }
    }
}
