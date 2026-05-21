<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Abarrotes', 'description' => 'Productos básicos de despensa'],
            ['name' => 'Bebidas', 'description' => 'Refrescos, jugos, agua'],
            ['name' => 'Lácteos', 'description' => 'Leche, queso, yogurt'],
            ['name' => 'Carnes y Embutidos', 'description' => 'Productos cárnicos'],
            ['name' => 'Frutas y Verduras', 'description' => 'Productos frescos'],
            ['name' => 'Limpieza', 'description' => 'Productos de limpieza del hogar'],
            ['name' => 'Higiene Personal', 'description' => 'Jabón, shampoo, pasta dental'],
            ['name' => 'Panadería', 'description' => 'Pan, galletas, tortillas'],
            ['name' => 'Botanas', 'description' => 'Papas, cacahuates, dulces'],
            ['name' => 'Varios', 'description' => 'Productos diversos'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
