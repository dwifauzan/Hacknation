<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BroadcastController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/kirim-pesan', [BroadcastController::class, 'kirimPesan'])->name('kirim.pesan');


