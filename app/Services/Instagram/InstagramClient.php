<?php

namespace App\Services\Instagram;

use Illuminate\Support\Facades\Http;

class InstagramClient
{
    public function login(string $username, string $password): array
    {
        return $this->request('POST', '/login', [
            'username' => $username,
            'password' => $password,
        ], 60);
    }

    public function status(): array
    {
        return $this->request('GET', '/status');
    }

    public function logout(): array
    {
        return $this->request('POST', '/logout');
    }

    private function request(string $method, string $path, array $payload = [], int $timeout = 10): array
    {
        $url = rtrim((string) config('services.instagram.url', 'http://instagram-service:8090'), '/') . $path;

        try {
            $request = Http::timeout($timeout)->acceptJson();
            $response = $method === 'GET'
                ? $request->get($url, $payload)
                : $request->post($url, $payload);
        } catch (\Throwable $exception) {
            throw new InstagramServiceException('Instagram service is unavailable.');
        }

        $data = $response->json();
        if ($response->failed()) {
            throw new InstagramServiceException(
                is_array($data)
                    ? ($data['message'] ?? $data['detail'] ?? 'Instagram login failed.')
                    : 'Instagram login failed.',
                $response->status(),
            );
        }

        if (! is_array($data)) {
            throw new InstagramServiceException('Instagram service returned an invalid response.');
        }

        return $data;
    }
}
