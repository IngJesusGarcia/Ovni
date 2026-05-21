<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained()->onDelete('cascade');
            $table->string('type', 20); // ingreso, retiro, venta, cancelacion
            $table->decimal('amount', 10, 2);
            $table->string('description')->nullable();
            $table->foreignId('user_id')->constrained();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
