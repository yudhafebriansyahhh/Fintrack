<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('icon', 50)->nullable()->after('type');
            $table->string('color', 30)->nullable()->after('icon');
            $table->boolean('is_default')->default(false)->after('color');
            $table->boolean('is_active')->default(true)->after('is_default');
        });

        DB::table('categories')->update([
            'is_active' => true,
            'is_default' => false,
        ]);
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['icon', 'color', 'is_default', 'is_active']);
        });
    }
};
