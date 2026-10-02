<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstagramAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_account_is_returned_before_login(): void
    {
        $this->getJson('/api/v1/instagram/account')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_login_requires_valid_username_and_password(): void
    {
        $this->postJson('/api/v1/instagram/account/login', [
            'username' => 'invalid username',
            'password' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['username', 'password']);
    }
}
