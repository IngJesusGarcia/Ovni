<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('cost', 10, 2)->default(0);
            $table->decimal('stock', 10, 3)->default(0);
            $table->decimal('min_stock', 10, 3)->default(0);
            $table->string('unit', 20)->default('pieza'); // pieza, kg
            $table->boolean('has_expiration')->default(false);
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index('code', 'idx_products_code');
            $table->index('name', 'idx_products_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
