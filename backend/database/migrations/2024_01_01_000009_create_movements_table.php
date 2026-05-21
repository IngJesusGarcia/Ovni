<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained();
            $table->string('type', 20); // entrada, salida, ajuste, venta, cancelacion
            $table->decimal('quantity', 10, 3);
            $table->decimal('stock_before', 10, 3);
            $table->decimal('stock_after', 10, 3);
            $table->string('reference_type', 50)->nullable(); // sale, adjustment, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->constrained();
            $table->timestamps();

            $table->index('product_id', 'idx_movements_product');
            $table->index(['reference_type', 'reference_id'], 'idx_movements_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movements');
    }
};
