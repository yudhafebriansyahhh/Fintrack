<?php

use App\Http\Controllers\Api\PlaceholderController;
use App\Http\Controllers\Api\TelegramWebhookController;
use App\Http\Controllers\Api\WhatsappWebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn (Request $request) => $request->user());

    Route::prefix('dashboard')->group(function () {
        Route::get('/summary', PlaceholderController::class);
        Route::get('/chart', PlaceholderController::class);
        Route::get('/recent-transactions', PlaceholderController::class);
        Route::get('/upcoming-bills', PlaceholderController::class);
    });

    Route::apiResource('categories', PlaceholderController::class)->names('api.categories');
    Route::apiResource('wallets', PlaceholderController::class)->names('api.wallets');
    Route::apiResource('transactions', PlaceholderController::class)->names('api.transactions');
    Route::apiResource('bill-groups', PlaceholderController::class)->names('api.bill-groups');

    Route::post('/bill-groups/{billGroup}/items', PlaceholderController::class);
    Route::post('/bill-groups/{billGroup}/generate-items', PlaceholderController::class);
    Route::put('/bill-items/{billItem}', PlaceholderController::class);
    Route::delete('/bill-items/{billItem}', PlaceholderController::class);
    Route::patch('/bill-items/{billItem}/mark-as-paid', PlaceholderController::class);
    Route::patch('/bill-items/{billItem}/mark-as-unpaid', PlaceholderController::class);
    Route::patch('/bill-items/{billItem}/cancel', PlaceholderController::class);

    Route::prefix('reports')->group(function () {
        Route::get('/summary', PlaceholderController::class);
        Route::get('/monthly', PlaceholderController::class);
        Route::get('/category', PlaceholderController::class);
        Route::get('/bills', PlaceholderController::class);
    });

    Route::prefix('whatsapp')->group(function () {
        Route::post('/send-message', PlaceholderController::class);
        Route::post('/send-reminder', PlaceholderController::class);
    });
});

Route::post('/whatsapp/webhook', WhatsappWebhookController::class);
Route::post('/telegram/webhook', TelegramWebhookController::class);
