<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BroadcastController extends Controller
{
    private function getWaBaseUrl(): string
    {
        return env('WHATSAPP_SERVICE_URL', 'http://whatsapp-service:8080');
    }

    public function status()
    {
        try {
            $response = Http::timeout(3)->get($this->getWaBaseUrl() . '/status');
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(3)->get('http://localhost:8080/status');
                if ($response->successful()) {
                    return response()->json($response->json());
                }
            } catch (\Exception $ex) {
                // Fallback error
            }
        }

        return response()->json([
            'connected' => false,
            'logged_in' => false,
            'jid' => '',
            'error' => 'Gagal terhubung ke WhatsApp microservice (Offline)'
        ], 503);
    }

    public function qr()
    {
        try {
            $response = Http::timeout(5)->get($this->getWaBaseUrl() . '/qr');
            if ($response->successful()) {
                $contentType = $response->header('Content-Type');
                if (str_contains($contentType, 'image/png')) {
                    return response($response->body(), 200)
                        ->header('Content-Type', 'image/png')
                        ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(5)->get('http://localhost:8080/qr');
                if ($response->successful()) {
                    $contentType = $response->header('Content-Type');
                    if (str_contains($contentType, 'image/png')) {
                        return response($response->body(), 200)
                            ->header('Content-Type', 'image/png')
                            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
                    }
                    return response()->json($response->json());
                }
            } catch (\Exception $ex) {
                // Fallback error
            }
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Gagal mengambil QR Code dari WhatsApp microservice'
        ], 503);
    }

    public function logout()
    {
        try {
            $response = Http::timeout(5)->post($this->getWaBaseUrl() . '/logout');
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(5)->post('http://localhost:8080/logout');
                if ($response->successful()) {
                    return response()->json($response->json());
                }
            } catch (\Exception $ex) {
                // Ignore
            }
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Gagal melakukan logout dari WhatsApp microservice'
        ], 500);
    }

    public function chats()
    {
        try {
            $response = Http::timeout(5)->get($this->getWaBaseUrl() . '/chats');
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(5)->get('http://localhost:8080/chats');
                if ($response->successful()) {
                    return response()->json($response->json());
                }
            } catch (\Exception $ex) {
                // Ignore
            }
        }

        return response()->json(['status' => 'success', 'data' => []]);
    }

    public function messages(Request $request)
    {
        $jid = $request->input('jid', '');
        try {
            $response = Http::timeout(5)->get($this->getWaBaseUrl() . '/messages', ['jid' => $jid]);
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(5)->get('http://localhost:8080/messages', ['jid' => $jid]);
                if ($response->successful()) {
                    return response()->json($response->json());
                }
            } catch (\Exception $ex) {
                // Ignore
            }
        }

        return response()->json(['status' => 'success', 'jid' => $jid, 'data' => []]);
    }

    public function kirimPesan(Request $request)
    {
        $target = $request->input('target');     // Nomor HP WhatsApp
        $pesan = $request->input('pesan');       // Isi pesan

        if (empty($target) || empty($pesan)) {
            $msg = 'Nomor HP WhatsApp dan isi pesan wajib diisi.';
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json(['status' => 'error', 'message' => $msg], 400);
            }
            return redirect()->back()->with('error', $msg);
        }

        $response = null;
        $baseUrl = $this->getWaBaseUrl();

        try {
            $response = Http::timeout(15)->post($baseUrl . '/send-wa', [
                'phone' => $target,
                'message' => $pesan
            ]);
        } catch (\Exception $e) {
            try {
                $response = Http::timeout(15)->post('http://localhost:8080/send-wa', [
                    'phone' => $target,
                    'message' => $pesan
                ]);
            } catch (\Exception $ex) {
                // Fail over
            }
        }

        if ($response && $response->successful()) {
            $responseData = $response->json();
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => $responseData['message'] ?? 'Pesan WhatsApp berhasil dikirim!',
                    'data' => $responseData['data'] ?? $responseData
                ]);
            }
            return redirect()->back()->with('success', 'Pesan WhatsApp berhasil dikirim!');
        }

        $errorMessage = 'Gagal menghubungi WhatsApp service.';
        if ($response) {
            $resJson = $response->json();
            $errorMessage = $resJson['message'] ?? $resJson['detail'] ?? $response->body();
        }

        if ($request->expectsJson() || $request->isJson()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengirim pesan WhatsApp: ' . $errorMessage
            ], $response ? $response->status() : 400);
        }
        return redirect()->back()->with('error', 'Gagal mengirim pesan WhatsApp: ' . $errorMessage);
    }
}