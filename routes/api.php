<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BroadcastController;

/*
|--------------------------------------------------------------------------
| API Routes (dipanggil frontend via VITE_LARAVEL_API_URL atau proxy /api/)
|--------------------------------------------------------------------------
| Prefix otomatis /api (lihat bootstrap/app.php).
| Contoh: GET http://localhost:8001/api/health
*/

// Health untuk cek koneksi frontend → Laravel
Route::get('/health', fn() => response()->json(['status' => 'ok', 'service' => 'laravel-app']));

// Proxy WhatsApp via Laravel (alternatif direct ke Go :8080).
// Frontend boleh pilih: direct VITE_WA_API_URL ATAU lewat sini agar satu origin.
Route::get('/whatsapp/status', [BroadcastController::class, 'status']);
Route::get('/whatsapp/qr', [BroadcastController::class, 'qr']);
Route::post('/whatsapp/logout', [BroadcastController::class, 'logout']);
Route::get('/whatsapp/chats', [BroadcastController::class, 'chats']);
Route::get('/whatsapp/messages', [BroadcastController::class, 'messages']);
Route::post('/whatsapp/send', [BroadcastController::class, 'kirimPesan']);

// TODO (bisnis): aktifkan saat Model/Controller sudah ada
// Route::apiResource('products', ProductController::class);
// Route::get('/orders', [OrderController::class, 'index']);
// Route::get('/activity-logs', [ActivityLogController::class, 'index']);
