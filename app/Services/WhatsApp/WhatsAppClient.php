<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class WhatsAppClient
{
    public function status(): array
    {
        return $this->get('/status');
    }

    public function qr(): Response
    {
        return $this->request('GET', '/qr');
    }

    public function logout(): array
    {
        return $this->post('/logout');
    }

    public function chats(): array
    {
        return $this->get('/chats');
    }

    public function messages(string $jid, ?int $beforeId = null): array
    {
        return $this->get('/messages', array_filter([
            'jid' => $jid,
            'before_id' => $beforeId,
        ], static fn ($value) => $value !== null));
    }

    public function send(string $phone, string $message): array
    {
        return $this->post('/send-wa', [
            'phone' => $phone,
            'message' => $message,
        ], 15);
    }

    private function get(string $path, array $query = []): array
    {
        return $this->json($this->request('GET', $path, $query));
    }

    private function post(string $path, array $payload = [], int $timeout = 5): array
    {
        return $this->json($this->request('POST', $path, $payload, $timeout));
    }

    private function json(Response $response): array
    {
        $data = $response->json();

        if (! is_array($data)) {
            throw new WhatsAppServiceException('WhatsApp service returned an invalid response.');
        }

        return $data;
    }

    private function request(
        string $method,
        string $path,
        array $payload = [],
        int $timeout = 5,
    ): Response {
        $baseUrl = rtrim((string) config('services.whatsapp.url', 'http://whatsapp-service:8080'), '/');

        try {
            $request = Http::timeout($timeout)->acceptJson();
            $response = $method === 'GET'
                ? $request->get($baseUrl . $path, $payload)
                : $request->post($baseUrl . $path, $payload);
        } catch (\Throwable $exception) {
            throw new WhatsAppServiceException(
                'WhatsApp microservice is unavailable.',
                503,
                ['exception' => $exception::class],
            );
        }

        if ($response->failed()) {
            throw new WhatsAppServiceException(
                $response->json('message') ?: 'WhatsApp microservice request failed.',
                $response->status(),
                ['body' => $response->body()],
            );
        }

        return $response;
    }
}
