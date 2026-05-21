<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            // Abarrotes (category_id: 1)
            ['code' => '7501000611072', 'name' => 'Azúcar Estándar 1kg', 'price' => 32.50, 'cost' => 26.00, 'stock' => 50, 'unit' => 'pieza', 'category_id' => 1],
            ['code' => '7501000611089', 'name' => 'Arroz Morelos 1kg', 'price' => 28.00, 'cost' => 22.00, 'stock' => 40, 'unit' => 'pieza', 'category_id' => 1],
            ['code' => '7501000611096', 'name' => 'Frijol Negro 1kg', 'price' => 35.00, 'cost' => 28.00, 'stock' => 35, 'unit' => 'pieza', 'category_id' => 1],
            ['code' => '7501000611102', 'name' => 'Aceite 123 1L', 'price' => 42.00, 'cost' => 34.00, 'stock' => 30, 'unit' => 'pieza', 'category_id' => 1],
            ['code' => '7501000611119', 'name' => 'Sal de Mar 1kg', 'price' => 15.00, 'cost' => 10.00, 'stock' => 60, 'unit' => 'pieza', 'category_id' => 1],

            // Bebidas (category_id: 2)
            ['code' => '7501031311309', 'name' => 'Coca-Cola 600ml', 'price' => 18.00, 'cost' => 13.50, 'stock' => 100, 'unit' => 'pieza', 'category_id' => 2],
            ['code' => '7501031311316', 'name' => 'Coca-Cola 2L', 'price' => 35.00, 'cost' => 27.00, 'stock' => 48, 'unit' => 'pieza', 'category_id' => 2],
            ['code' => '7501086801077', 'name' => 'Agua Ciel 1L', 'price' => 12.00, 'cost' => 8.00, 'stock' => 80, 'unit' => 'pieza', 'category_id' => 2],
            ['code' => '7501031311323', 'name' => 'Pepsi 600ml', 'price' => 17.00, 'cost' => 13.00, 'stock' => 70, 'unit' => 'pieza', 'category_id' => 2],

            // Lácteos (category_id: 3)
            ['code' => '7501040000124', 'name' => 'Leche Lala 1L', 'price' => 26.00, 'cost' => 21.00, 'stock' => 30, 'unit' => 'pieza', 'category_id' => 3, 'has_expiration' => true],
            ['code' => '7501040000131', 'name' => 'Yogurt Lala 1L', 'price' => 32.00, 'cost' => 25.00, 'stock' => 20, 'unit' => 'pieza', 'category_id' => 3, 'has_expiration' => true],

            // Frutas y Verduras - por peso (category_id: 5)
            ['code' => 'FV001', 'name' => 'Jitomate', 'price' => 25.00, 'cost' => 18.00, 'stock' => 20.000, 'unit' => 'kg', 'category_id' => 5],
            ['code' => 'FV002', 'name' => 'Cebolla Blanca', 'price' => 22.00, 'cost' => 15.00, 'stock' => 15.000, 'unit' => 'kg', 'category_id' => 5],
            ['code' => 'FV003', 'name' => 'Papa', 'price' => 20.00, 'cost' => 14.00, 'stock' => 25.000, 'unit' => 'kg', 'category_id' => 5],
            ['code' => 'FV004', 'name' => 'Plátano', 'price' => 18.00, 'cost' => 12.00, 'stock' => 18.000, 'unit' => 'kg', 'category_id' => 5],

            // Limpieza (category_id: 6)
            ['code' => '7501035910010', 'name' => 'Cloro Cloralex 1L', 'price' => 22.00, 'cost' => 16.00, 'stock' => 25, 'unit' => 'pieza', 'category_id' => 6],
            ['code' => '7501035910027', 'name' => 'Jabón Zote 400g', 'price' => 18.00, 'cost' => 13.00, 'stock' => 40, 'unit' => 'pieza', 'category_id' => 6],

            // Botanas (category_id: 9)
            ['code' => '7501011115019', 'name' => 'Sabritas Original 45g', 'price' => 18.00, 'cost' => 14.00, 'stock' => 50, 'unit' => 'pieza', 'category_id' => 9],
            ['code' => '7501011115026', 'name' => 'Doritos Nacho 62g', 'price' => 20.00, 'cost' => 15.50, 'stock' => 50, 'unit' => 'pieza', 'category_id' => 9],

            // Panadería (category_id: 8)
            ['code' => '7501070401015', 'name' => 'Pan Bimbo Grande', 'price' => 58.00, 'cost' => 45.00, 'stock' => 15, 'unit' => 'pieza', 'category_id' => 8, 'has_expiration' => true],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}
