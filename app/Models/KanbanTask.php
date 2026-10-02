<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KanbanTask extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'assignee',
        'due_date',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date:Y-m-d',
        ];
    }
}
