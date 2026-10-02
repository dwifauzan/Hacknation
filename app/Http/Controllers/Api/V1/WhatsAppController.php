<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendWhatsAppMessageRequest;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WhatsAppController extends Controller
{
    public function __construct(private readonly WhatsAppClient $whatsapp)
    {
    }

    public function status(): JsonResponse
    {
        return response()->json($this->whatsapp->status());
    }

    public function logout(): JsonResponse
    {
        return response()->json($this->whatsapp->logout());
    }

    public function qr(): Response
    {
        $response = $this->whatsapp->qr();

        return response($response->body(), $response->status())
            ->header('Content-Type', (string) $response->header('Content-Type'))
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    public function chats(): JsonResponse
    {
        return response()->json($this->whatsapp->chats());
    }

    public function messages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jid' => ['required', 'string', 'max:255'],
            'before_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return response()->json($this->whatsapp->messages(
            $validated['jid'],
            $validated['before_id'] ?? null,
        ));
    }

    public function send(SendWhatsAppMessageRequest $request): JsonResponse
    {
        $validated = $request->validated();

        return response()->json($this->whatsapp->send(
            $validated['target'],
            $validated['pesan'],
        ));
    }
}
