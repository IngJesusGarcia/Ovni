<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 30)->unique();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cash_register_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('payment_type', 20)->default('efectivo'); // efectivo, tarjeta, transferencia, mixto
            $table->json('payment_details')->nullable();
            $table->string('status', 20)->default('completada'); // completada, cancelada, pendiente
            $table->text('cancel_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('created_at', 'idx_sales_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
