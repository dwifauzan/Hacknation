<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http; // Wajib di-import agar bisa menembak API HTTP

class BroadcastController extends Controller
{
    public function kirimPesan(Request $request)
    {
        // 1. Ambil data dari inputan form
        $platform = $request->input('platform'); // 'wa' atau 'ig'
        $target = $request->input('target');     // Nomor HP atau username IG
        $pesan = $request->input('pesan');       // Isi pesan

        $response = null;

        // 2. Tentukan service mana yang akan dipanggil
        if ($platform === 'wa') {
            // Panggil API Go (berjalan di container docker 'whatsapp-service')
            $response = Http::post('http://whatsapp-service:8080/send-wa', [
                'phone' => $target,
                'message' => $pesan
            ]);
        } elseif ($platform === 'ig') {
            // Panggil API Python (berjalan di container docker 'instagram-service')
            $response = Http::post('http://instagram-service:8000/send-dm', [
                'username' => $target,
                'message' => $pesan
            ]);
        } else {
            return redirect()->back()->with('error', 'Platform tidak dikenal.');
        }

        // 3. Kembalikan feedback ke frontend
        if ($response && $response->successful()) {
            return redirect()->back()->with('success', 'Pesan berhasil dikirim!');
        }

        $errorMessage = $response ? ($response->json('message') ?? $response->body()) : 'Gagal menghubungi service.';
        return redirect()->back()->with('error', 'Gagal mengirim pesan: ' . $errorMessage);
    }
}