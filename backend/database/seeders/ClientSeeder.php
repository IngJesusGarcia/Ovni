<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        // Cliente general (siempre id=1)
        Client::create([
            'name' => 'Público General',
            'phone' => null,
            'credit_limit' => 0,
            'balance' => 0,
        ]);

        // Clientes de ejemplo
        Client::create([
            'name' => 'María González',
            'phone' => '6141234567',
            'credit_limit' => 2000.00,
            'balance' => 0,
        ]);

        Client::create([
            'name' => 'Juan Pérez',
            'phone' => '6149876543',
            'credit_limit' => 1500.00,
            'balance' => 0,
        ]);

        Client::create([
            'name' => 'Rosa López',
            'phone' => '6145551234',
            'credit_limit' => 3000.00,
            'balance' => 0,
        ]);
    }
}
