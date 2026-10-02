<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanTaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_can_be_created_and_listed(): void
    {
        $this->postJson('/api/v1/kanban/tasks', [
            'title' => 'Create onboarding flow',
            'status' => 'todo',
            'priority' => 'high',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Create onboarding flow');

        $this->getJson('/api/v1/kanban/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_task_can_move_between_columns(): void
    {
        $task = $this->postJson('/api/v1/kanban/tasks', [
            'title' => 'Add Kanban board',
        ])->json('data');

        $this->patchJson("/api/v1/kanban/tasks/{$task['id']}/move", [
            'status' => 'in_progress',
            'position' => 0,
        ])->assertOk()
            ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_task_can_be_updated_and_deleted(): void
    {
        $task = $this->postJson('/api/v1/kanban/tasks', [
            'title' => 'Initial title',
        ])->json('data');

        $this->patchJson("/api/v1/kanban/tasks/{$task['id']}", [
            'title' => 'Updated title',
            'priority' => 'urgent',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated title')
            ->assertJsonPath('data.priority', 'urgent');

        $this->deleteJson("/api/v1/kanban/tasks/{$task['id']}")
            ->assertNoContent();

        $this->getJson('/api/v1/kanban/tasks')
            ->assertJsonCount(0, 'data');
    }

    public function test_invalid_task_values_are_rejected(): void
    {
        $this->postJson('/api/v1/kanban/tasks', [
            'title' => '',
            'status' => 'invalid',
            'priority' => 'invalid',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'priority']);
    }
}
