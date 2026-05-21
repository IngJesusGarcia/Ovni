<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'business_name', 'value' => 'Mi Abarrotes', 'group' => 'general', 'description' => 'Nombre del negocio'],
            ['key' => 'business_address', 'value' => 'Calle Principal #123', 'group' => 'general', 'description' => 'Dirección del negocio'],
            ['key' => 'business_phone', 'value' => '614-000-0000', 'group' => 'general', 'description' => 'Teléfono del negocio'],
            ['key' => 'business_rfc', 'value' => 'XAXX010101000', 'group' => 'general', 'description' => 'RFC del negocio'],

            // Ticket
            ['key' => 'ticket_header', 'value' => '*** MI ABARROTES ***', 'group' => 'ticket', 'description' => 'Encabezado del ticket'],
            ['key' => 'ticket_footer', 'value' => '¡Gracias por su compra!', 'group' => 'ticket', 'description' => 'Pie del ticket'],
            ['key' => 'ticket_show_address', 'value' => '1', 'group' => 'ticket', 'description' => 'Mostrar dirección en ticket'],

            // Ventas
            ['key' => 'tax_rate', 'value' => '0.16', 'group' => 'ventas', 'description' => 'Tasa de IVA (0 = sin IVA)'],
            ['key' => 'allow_negative_stock', 'value' => '0', 'group' => 'ventas', 'description' => 'Permitir inventario negativo'],
            ['key' => 'default_payment_type', 'value' => 'efectivo', 'group' => 'ventas', 'description' => 'Método de pago predeterminado'],

            // Sistema
            ['key' => 'dark_mode', 'value' => '1', 'group' => 'sistema', 'description' => 'Modo oscuro por defecto'],
            ['key' => 'folio_prefix', 'value' => 'T', 'group' => 'sistema', 'description' => 'Prefijo para folios de ticket'],
        ];

        foreach ($settings as $setting) {
            Setting::create($setting);
        }
    }
}
