<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InstagramLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._]+$/'],
            'password' => ['required', 'string', 'max:256'],
        ];
    }
}
