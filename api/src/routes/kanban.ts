import { Router, type Request, type Response } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { database } from '../db.js';
import {
    kanbanPriorities,
    kanbanStatuses,
    type KanbanPriority,
    type KanbanStatus,
} from '../config/kanban.js';

type KanbanTask = {
    id: number;
    title: string;
    description: string | null;
    status: KanbanStatus;
    priority: KanbanPriority;
    assignee: string | null;
    due_date: string | null;
    position: number;
    created_at: string | null;
    updated_at: string | null;
};

const router = Router();

function isStatus(value: unknown): value is KanbanStatus {
    return typeof value === 'string' && value in kanbanStatuses;
}

function isPriority(value: unknown): value is KanbanPriority {
    return typeof value === 'string' && value in kanbanPriorities;
}

function validationError(response: Response, message: string) {
    return response.status(422).json({ message, errors: { request: [message] } });
}

function taskById(id: number): KanbanTask | undefined {
    return database.prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(id) as KanbanTask | undefined;
}

function parseId(request: Request, response: Response): number | undefined {
    const id = Number(request.params.kanbanTask);
    if (!Number.isInteger(id) || id < 1) {
        response.status(404).json({ message: 'Kanban task not found.' });
        return undefined;
    }
    return id;
}

function now() {
    return new Date().toISOString();
}

function toSqlValue(value: unknown): SQLInputValue | undefined {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
        return value;
    }
    return undefined;
}

router.get('/tasks', (request, response) => {
    const status = request.query.status;
    if (status !== undefined && !isStatus(status)) {
        return validationError(response, 'The selected status is invalid.');
    }

    const tasks = database
        .prepare(`
            SELECT * FROM kanban_tasks
            ${status === undefined ? '' : 'WHERE status = ?'}
            ORDER BY CASE status
                WHEN 'backlog' THEN 1
                WHEN 'todo' THEN 2
                WHEN 'in_progress' THEN 3
                WHEN 'done' THEN 4
                ELSE 5
            END, position ASC, created_at DESC
        `)
        .all(...(status === undefined ? [] : [status])) as KanbanTask[];

    return response.json({
        data: tasks,
        meta: {
            statuses: kanbanStatuses,
            priorities: kanbanPriorities,
        },
    });
});

router.post('/tasks', (request, response) => {
    const body = request.body as Record<string, unknown>;
    const title = body.title;
    const status = body.status ?? 'backlog';
    const priority = body.priority ?? 'medium';
    const position = body.position ?? 0;
    const numericPosition = typeof position === 'number' ? position : Number.NaN;

    if (typeof title !== 'string' || title.length === 0 || title.length > 160) {
        return validationError(response, 'The title must be between 1 and 160 characters.');
    }
    if (!isStatus(status)) {
        return validationError(response, 'The selected status is invalid.');
    }
    if (!isPriority(priority)) {
        return validationError(response, 'The selected priority is invalid.');
    }
    if (!Number.isInteger(numericPosition) || numericPosition < 0) {
        return validationError(response, 'The position must be a non-negative integer.');
    }

    const timestamp = now();
    const result = database
        .prepare(`
            INSERT INTO kanban_tasks
                (title, description, status, priority, assignee, due_date, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
            title,
            typeof body.description === 'string' ? body.description : null,
            status,
            priority,
            typeof body.assignee === 'string' ? body.assignee : null,
            typeof body.due_date === 'string' ? body.due_date : null,
            numericPosition,
            timestamp,
            timestamp,
        );

    return response.status(201).json({ data: taskById(Number(result.lastInsertRowid)) });
});

router.patch('/tasks/:kanbanTask', (request, response) => {
    const id = parseId(request, response);
    if (id === undefined) return;

    if (!taskById(id)) {
        return response.status(404).json({ message: 'Kanban task not found.' });
    }

    const body = request.body as Record<string, unknown>;
    const fields: string[] = [];
    const values: SQLInputValue[] = [];
    const allowedFields = ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'position'] as const;

    for (const field of allowedFields) {
        if (!(field in body)) continue;
        if (field === 'title' && (typeof body[field] !== 'string' || body[field].length === 0 || body[field].length > 160)) {
            return validationError(response, 'The title must be between 1 and 160 characters.');
        }
        if (field === 'status' && !isStatus(body[field])) {
            return validationError(response, 'The selected status is invalid.');
        }
        if (field === 'priority' && !isPriority(body[field])) {
            return validationError(response, 'The selected priority is invalid.');
        }
        if (field === 'position' && (!Number.isInteger(body[field]) || Number(body[field]) < 0)) {
            return validationError(response, 'The position must be a non-negative integer.');
        }
        const value = toSqlValue(body[field]);
        if (value === undefined) {
            return validationError(response, `The ${field} value is invalid.`);
        }
        fields.push(`${field} = ?`);
        values.push(value);
    }

    if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(now(), id);
        database.prepare(`UPDATE kanban_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return response.json({ data: taskById(id) });
});

router.patch('/tasks/:kanbanTask/move', (request, response) => {
    const id = parseId(request, response);
    if (id === undefined) return;

    const task = taskById(id);
    if (!task) return response.status(404).json({ message: 'Kanban task not found.' });

    const { status, position } = request.body as Record<string, unknown>;
    const numericPosition = typeof position === 'number' ? position : Number.NaN;
    if (!isStatus(status) || !Number.isInteger(numericPosition) || numericPosition < 0) {
        return validationError(response, 'A valid status and non-negative position are required.');
    }

    database.exec('BEGIN');
    try {
        if (task.status !== status) {
            database
                .prepare('UPDATE kanban_tasks SET position = position - 1 WHERE status = ? AND position > ?')
                .run(task.status, task.position);
        }
        database
            .prepare('UPDATE kanban_tasks SET position = position + 1 WHERE status = ? AND id != ? AND position >= ?')
            .run(status, id, numericPosition);
        database
            .prepare('UPDATE kanban_tasks SET status = ?, position = ?, updated_at = ? WHERE id = ?')
            .run(status, numericPosition, now(), id);
        database.exec('COMMIT');
    } catch (error) {
        database.exec('ROLLBACK');
        throw error;
    }

    return response.json({ data: taskById(id) });
});

router.delete('/tasks/:kanbanTask', (request, response) => {
    const id = parseId(request, response);
    if (id === undefined) return;

    const result = database.prepare('DELETE FROM kanban_tasks WHERE id = ?').run(id);
    if (result.changes === 0) {
        return response.status(404).json({ message: 'Kanban task not found.' });
    }

    return response.status(204).send();
});

export default router;
