<?php

use App\Http\Controllers\Admin\Api\UserController as AdminUserController;
use App\Http\Controllers\Auth\Api\LoginController;
use App\Http\Controllers\Seller\Api\ProductController as SellerProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Admin routes
Route::prefix('admin')->group(function () {
    Route::post('/login', [LoginController::class, 'adminLogin']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/sellers', [AdminUserController::class, 'store']);
        Route::get('/sellers', [AdminUserController::class, 'index']);
    });
});

// Seller routes
Route::prefix('seller')->group(function () {
    Route::post('/login', [LoginController::class, 'sellerLogin']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('products', SellerProductController::class)->except(['show', 'update']);
        Route::get('/products/{product}/pdf', [SellerProductController::class, 'generatePdf']);
    });
});
