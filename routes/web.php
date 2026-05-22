<?php

use App\Http\Controllers\BillGroupController;
use App\Http\Controllers\BillItemController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TelegramController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WhatsappController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\WalletTransferController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', DashboardController::class)->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::resource('wallets', WalletController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    Route::patch('/wallets/{wallet}/balance', [WalletController::class, 'updateBalance'])->name('wallets.balance');
    Route::post('/wallet-transfers', [WalletTransferController::class, 'store'])->name('wallet-transfers.store');

    Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('/categories/seed-defaults', [CategoryController::class, 'seedDefaults'])->name('categories.seed-defaults');

    Route::resource('transactions', TransactionController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::get('/bills', [BillGroupController::class, 'index'])->name('bills.index');
    Route::post('/bills', [BillGroupController::class, 'store'])->name('bills.store');
    Route::patch('/bills/{billGroup}', [BillGroupController::class, 'update'])->name('bills.update');
    Route::delete('/bills/{billGroup}', [BillGroupController::class, 'destroy'])->name('bills.destroy');
    Route::post('/bills/{billGroup}/generate', [BillGroupController::class, 'generateItems'])->name('bills.generate');

    Route::post('/bills/{billGroup}/items', [BillItemController::class, 'store'])->name('bill-items.store');
    Route::patch('/bill-items/{billItem}', [BillItemController::class, 'update'])->name('bill-items.update');
    Route::delete('/bill-items/{billItem}', [BillItemController::class, 'destroy'])->name('bill-items.destroy');
    Route::patch('/bill-items/{billItem}/paid', [BillItemController::class, 'markPaid'])->name('bill-items.paid');
    Route::patch('/bill-items/{billItem}/unpaid', [BillItemController::class, 'markUnpaid'])->name('bill-items.unpaid');
    Route::patch('/bill-items/{billItem}/cancel', [BillItemController::class, 'cancel'])->name('bill-items.cancel');

    Route::post('/debts', [DebtController::class, 'store'])->name('debts.store');
    Route::patch('/debts/{debt}', [DebtController::class, 'update'])->name('debts.update');
    Route::delete('/debts/{debt}', [DebtController::class, 'destroy'])->name('debts.destroy');
    Route::patch('/debts/{debt}/paid', [DebtController::class, 'markPaid'])->name('debts.paid');
    Route::patch('/debts/{debt}/unpaid', [DebtController::class, 'markUnpaid'])->name('debts.unpaid');
    Route::patch('/debts/{debt}/cancel', [DebtController::class, 'cancel'])->name('debts.cancel');

    Route::get('/whatsapp', [WhatsappController::class, 'index'])->name('whatsapp.index');
    Route::post('/whatsapp/request-otp', [WhatsappController::class, 'requestOtp'])->name('whatsapp.request-otp');
    Route::post('/whatsapp/verify', [WhatsappController::class, 'verifyOtp'])->name('whatsapp.verify');
    Route::delete('/whatsapp', [WhatsappController::class, 'unlink'])->name('whatsapp.unlink');

    Route::get('/telegram', [TelegramController::class, 'index'])->name('telegram.index');
    Route::post('/telegram/request-otp', [TelegramController::class, 'requestOtp'])->name('telegram.request-otp');
    Route::post('/telegram/verify', [TelegramController::class, 'verifyOtp'])->name('telegram.verify');
    Route::delete('/telegram', [TelegramController::class, 'unlink'])->name('telegram.unlink');

    Route::get('/reports', ReportController::class)->name('reports.index');

    Route::get('/settings', SettingsController::class)->name('settings.index');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
