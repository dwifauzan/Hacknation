<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendWhatsAppMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target' => ['required', 'string', 'max:30', 'regex:/^[0-9+() .-]+$/'],
            'pesan' => ['required', 'string', 'max:4096'],
        ];
    }
}
