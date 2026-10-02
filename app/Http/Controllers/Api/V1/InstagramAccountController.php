<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\InstagramLoginRequest;
use App\Models\InstagramAccount;
use App\Services\Instagram\InstagramClient;
use App\Services\Instagram\InstagramServiceException;
use Illuminate\Http\JsonResponse;

class InstagramAccountController extends Controller
{
    public function __construct(private readonly InstagramClient $instagram)
    {
    }

    public function show(): JsonResponse
    {
        $account = InstagramAccount::query()->latest('id')->first();

        return response()->json(['data' => $account]);
    }

    public function login(InstagramLoginRequest $request): JsonResponse
    {
        try {
            $result = $this->instagram->login(
                $request->validated('username'),
                $request->validated('password'),
            );
        } catch (InstagramServiceException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'status' => 'error',
            ], $exception->status);
        }

        $account = InstagramAccount::updateOrCreate(
            ['username' => $result['username'] ?? $request->validated('username')],
            [
                'display_name' => $result['display_name'] ?? null,
                'instagram_user_id' => (string) ($result['user_id'] ?? ''),
                'status' => 'connected',
                'session_reference' => $result['session_reference'] ?? null,
                'last_checked_at' => now(),
                'last_error' => null,
            ],
        );

        return response()->json(['data' => $account]);
    }

    public function check(): JsonResponse
    {
        $account = InstagramAccount::query()->latest('id')->first();
        if (! $account) {
            return response()->json(['data' => null]);
        }

        try {
            $result = $this->instagram->status();
            $account->update([
                'status' => $result['status'] ?? 'connected',
                'last_checked_at' => now(),
                'last_error' => null,
            ]);
        } catch (InstagramServiceException $exception) {
            $account->update([
                'status' => 'error',
                'last_checked_at' => now(),
                'last_error' => $exception->getMessage(),
            ]);
        }

        return response()->json(['data' => $account->fresh()]);
    }

    public function logout(): JsonResponse
    {
        try {
            $this->instagram->logout();
        } catch (InstagramServiceException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }

        InstagramAccount::query()->latest('id')->first()?->update([
            'status' => 'logged_out',
            'session_reference' => null,
            'last_checked_at' => now(),
        ]);

        return response()->json(['status' => 'logged_out']);
    }
}
