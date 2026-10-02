<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKanbanTaskRequest;
use App\Http\Requests\UpdateKanbanTaskRequest;
use App\Models\KanbanTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class KanbanTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = KanbanTask::query()
            ->when($request->filled('status'), fn ($query) => $query->where('status', (string) $request->string('status')))
            ->orderByRaw("CASE status WHEN 'backlog' THEN 1 WHEN 'todo' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'done' THEN 4 ELSE 5 END")
            ->orderBy('position')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $tasks,
            'meta' => [
                'statuses' => config('kanban.statuses'),
                'priorities' => config('kanban.priorities'),
            ],
        ]);
    }

    public function store(StoreKanbanTaskRequest $request): JsonResponse
    {
        $attributes = $request->validated();
        $attributes['status'] ??= 'backlog';
        $attributes['priority'] ??= 'medium';
        $attributes['position'] ??= KanbanTask::where('status', $attributes['status'])->max('position') + 1;

        $task = KanbanTask::create($attributes);

        return response()->json(['data' => $task], 201);
    }

    public function update(UpdateKanbanTaskRequest $request, KanbanTask $kanbanTask): JsonResponse
    {
        $kanbanTask->update($request->validated());

        return response()->json(['data' => $kanbanTask->fresh()]);
    }

    public function destroy(KanbanTask $kanbanTask): JsonResponse
    {
        $kanbanTask->delete();

        return response()->json([], 204);
    }

    public function move(Request $request, KanbanTask $kanbanTask): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(array_keys(config('kanban.statuses')))],
            'position' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($kanbanTask, $validated): void {
            $oldStatus = $kanbanTask->status;
            $newStatus = $validated['status'];
            $newPosition = $validated['position'];

            if ($oldStatus !== $newStatus) {
                KanbanTask::where('status', $oldStatus)
                    ->where('position', '>', $kanbanTask->position)
                    ->decrement('position');
            }

            KanbanTask::where('status', $newStatus)
                ->where('id', '!=', $kanbanTask->id)
                ->where('position', '>=', $newPosition)
                ->increment('position');

            $kanbanTask->update([
                'status' => $newStatus,
                'position' => $newPosition,
            ]);
        });

        return response()->json(['data' => $kanbanTask->fresh()]);
    }
}
