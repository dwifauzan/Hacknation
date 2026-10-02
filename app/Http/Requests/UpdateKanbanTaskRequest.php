<?php

namespace App\Http\Requests;

class UpdateKanbanTaskRequest extends StoreKanbanTaskRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'title' => ['sometimes', 'required', 'string', 'max:160'],
        ]);
    }
}
