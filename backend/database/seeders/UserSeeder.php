<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        $admin = User::create([
            'name' => 'Administrador',
            'email' => 'admin@sicar.pos',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        Permission::create([
            'user_id' => $admin->id,
            'can_discount' => true,
            'can_return' => true,
            'can_cancel' => true,
            'max_discount_percent' => 100,
        ]);

        // Cajero demo
        $cajero = User::create([
            'name' => 'Cajero Demo',
            'email' => 'cajero@sicar.pos',
            'password' => bcrypt('cajero123'),
            'role' => 'cajero',
            'is_active' => true,
        ]);

        Permission::create([
            'user_id' => $cajero->id,
            'can_discount' => true,
            'can_return' => false,
            'can_cancel' => false,
            'max_discount_percent' => 10,
        ]);
    }
}
