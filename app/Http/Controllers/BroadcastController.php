<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendWhatsAppMessageRequest;
use App\Services\WhatsApp\WhatsAppClient;
use App\Services\WhatsApp\WhatsAppServiceException;
use Illuminate\Http\Request;

class BroadcastController extends Controller
{
    public function __construct(private readonly WhatsAppClient $whatsapp)
    {
    }

    public function status()
    {
        return $this->json(fn () => $this->whatsapp->status());
    }

    public function qr()
    {
        try {
            $response = $this->whatsapp->qr();

            if (str_contains((string) $response->header('Content-Type'), 'image/png')) {
                return response($response->body(), 200)
                    ->header('Content-Type', 'image/png')
                    ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
            }

            return response()->json($response->json());
        } catch (WhatsAppServiceException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], $exception->status);
        }
    }

    public function logout()
    {
        return $this->json(fn () => $this->whatsapp->logout());
    }

    public function chats()
    {
        return $this->json(fn () => $this->whatsapp->chats());
    }

    public function messages(Request $request)
    {
        $validated = $request->validate([
            'jid' => ['required', 'string', 'max:255'],
            'before_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return $this->json(fn () => $this->whatsapp->messages(
            $validated['jid'],
            $validated['before_id'] ?? null,
        ));
    }

    public function kirimPesan(SendWhatsAppMessageRequest $request)
    {
        $validated = $request->validated();

        try {
            $result = $this->whatsapp->send($validated['target'], $validated['pesan']);
        } catch (WhatsAppServiceException $exception) {
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json([
                    'status' => 'error',
                    'message' => $exception->getMessage(),
                ], $exception->status);
            }

            return redirect()->back()->with('error', $exception->getMessage());
        }

        if ($request->expectsJson() || $request->isJson()) {
            return response()->json($result);
        }

        return redirect()->back()->with('success', $result['message'] ?? 'Pesan WhatsApp berhasil dikirim!');
    }

    private function json(callable $callback)
    {
        try {
            return response()->json($callback());
        } catch (WhatsAppServiceException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], $exception->status);
        }
    }
}
