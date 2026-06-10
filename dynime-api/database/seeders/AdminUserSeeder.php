<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        AdminUser::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@dynime.com')],
            [
                'name'     => 'Dynime Admin',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'change-this-password-now')),
                'role'     => 'super_admin',
                'is_active'=> true,
            ]
        );

        $this->command->info('✅ Admin user created: ' . env('ADMIN_EMAIL', 'admin@dynime.com'));
        $this->command->warn('⚠️  Remember to change the admin password after first login!');
    }
}
