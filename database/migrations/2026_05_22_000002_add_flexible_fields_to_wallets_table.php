<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->foreignId('wallet_provider_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('account_name', 100)->nullable()->after('account_number');
            $table->string('phone_number', 30)->nullable()->after('account_name');
            $table->string('custom_logo')->nullable()->after('phone_number');
            $table->boolean('is_primary')->default(false)->after('custom_logo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('wallet_provider_id');
            $table->dropColumn([
                'account_name',
                'phone_number',
                'custom_logo',
                'is_primary',
            ]);
        });
    }
};
