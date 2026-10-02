<?php

use App\Http\Controllers\Api\V1\WhatsAppController;
use App\Http\Controllers\Api\V1\KanbanTaskController;
use App\Http\Controllers\Api\V1\InstagramAccountController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/whatsapp')->name('api.v1.whatsapp.')->group(function () {
    Route::get('/status', [WhatsAppController::class, 'status'])->name('status');
    Route::get('/qr', [WhatsAppController::class, 'qr'])->name('qr');
    Route::post('/logout', [WhatsAppController::class, 'logout'])->name('logout');
    Route::get('/chats', [WhatsAppController::class, 'chats'])->name('chats');
    Route::get('/messages', [WhatsAppController::class, 'messages'])->name('messages');
    Route::post('/messages', [WhatsAppController::class, 'send'])->name('messages.send');
});

Route::prefix('v1/kanban')->name('api.v1.kanban.')->group(function () {
    Route::get('/tasks', [KanbanTaskController::class, 'index'])->name('tasks.index');
    Route::post('/tasks', [KanbanTaskController::class, 'store'])->name('tasks.store');
    Route::patch('/tasks/{kanbanTask}', [KanbanTaskController::class, 'update'])->name('tasks.update');
    Route::patch('/tasks/{kanbanTask}/move', [KanbanTaskController::class, 'move'])->name('tasks.move');
    Route::delete('/tasks/{kanbanTask}', [KanbanTaskController::class, 'destroy'])->name('tasks.destroy');
});

Route::prefix('v1/instagram')->name('api.v1.instagram.')->group(function () {
    Route::get('/account', [InstagramAccountController::class, 'show'])->name('account.show');
    Route::post('/account/login', [InstagramAccountController::class, 'login'])->name('account.login');
    Route::post('/account/check', [InstagramAccountController::class, 'check'])->name('account.check');
    Route::post('/account/logout', [InstagramAccountController::class, 'logout'])->name('account.logout');
});
