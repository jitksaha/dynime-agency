<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'site_name',        'value' => 'Dynime',                          'group' => 'general', 'is_public' => true],
            ['key' => 'site_tagline',     'value' => 'Building Digital Excellence',     'group' => 'general', 'is_public' => true],
            ['key' => 'site_description', 'value' => 'Dynime is a digital solutions company specializing in web development, design, and digital marketing.', 'group' => 'general', 'is_public' => true],
            ['key' => 'site_logo',        'value' => null,                              'group' => 'general', 'is_public' => true],
            ['key' => 'site_favicon',     'value' => null,                              'group' => 'general', 'is_public' => true],

            // Contact
            ['key' => 'contact_email',    'value' => 'hello@dynime.com',               'group' => 'contact', 'is_public' => true],
            ['key' => 'contact_phone',    'value' => null,                             'group' => 'contact', 'is_public' => true],
            ['key' => 'contact_address',  'value' => null,                             'group' => 'contact', 'is_public' => true],

            // Social
            ['key' => 'social_facebook',  'value' => null,                             'group' => 'social',  'is_public' => true],
            ['key' => 'social_twitter',   'value' => null,                             'group' => 'social',  'is_public' => true],
            ['key' => 'social_linkedin',  'value' => null,                             'group' => 'social',  'is_public' => true],
            ['key' => 'social_instagram', 'value' => null,                             'group' => 'social',  'is_public' => true],
            ['key' => 'social_youtube',   'value' => null,                             'group' => 'social',  'is_public' => true],

            // SEO
            ['key' => 'seo_default_title',       'value' => 'Dynime — Building Digital Excellence', 'group' => 'seo', 'is_public' => true],
            ['key' => 'seo_default_description', 'value' => null,                              'group' => 'seo', 'is_public' => true],
            ['key' => 'seo_og_image',            'value' => null,                              'group' => 'seo', 'is_public' => true],
            ['key' => 'google_analytics_id',     'value' => null,                              'group' => 'seo', 'is_public' => true],

            // Mail
            ['key' => 'mail_notification_email', 'value' => 'hello@dynime.com',               'group' => 'mail', 'is_public' => false],
            ['key' => 'mail_contact_auto_reply',  'value' => true,                            'group' => 'mail', 'is_public' => false],

            // Features
            ['key' => 'feature_blog_enabled',      'value' => true,  'group' => 'features', 'is_public' => true],
            ['key' => 'feature_careers_enabled',   'value' => true,  'group' => 'features', 'is_public' => true],
            ['key' => 'feature_portfolio_enabled', 'value' => true,  'group' => 'features', 'is_public' => true],
            ['key' => 'maintenance_mode',          'value' => false, 'group' => 'features', 'is_public' => true],
        ];

        foreach ($settings as $setting) {
            SiteSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value'     => $setting['value'],
                    'group'     => $setting['group'],
                    'is_public' => $setting['is_public'],
                ]
            );
        }

        $this->command->info('✅ Site settings seeded: ' . count($settings) . ' settings created.');
    }
}
