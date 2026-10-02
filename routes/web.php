<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BroadcastController;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/kanban', 'kanban')->name('kanban');
Route::view('/instagram/accounts', 'instagram-accounts')->name('instagram.accounts');

Route::get('/whatsapp/status', [BroadcastController::class, 'status'])->name('whatsapp.status');
Route::get('/whatsapp/qr', [BroadcastController::class, 'qr'])->name('whatsapp.qr');
Route::post('/whatsapp/logout', [BroadcastController::class, 'logout'])->name('whatsapp.logout');
Route::get('/whatsapp/chats', [BroadcastController::class, 'chats'])->name('whatsapp.chats');
Route::get('/whatsapp/messages', [BroadcastController::class, 'messages'])->name('whatsapp.messages');
Route::post('/kirim-pesan', [BroadcastController::class, 'kirimPesan'])->name('kirim.pesan');
