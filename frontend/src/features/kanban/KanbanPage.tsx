import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Task = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: string | null;
    due_date: string | null;
};

type KanbanResponse = {
    data: Task[];
    meta: {
        statuses: Record<string, string>;
        priorities: Record<string, string>;
    };
};

const fallbackStatuses = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
};

const fallbackPriorities = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

export function KanbanPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statuses, setStatuses] = useState<Record<string, string>>(fallbackStatuses);
    const [priorities, setPriorities] = useState<Record<string, string>>(fallbackPriorities);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    async function loadTasks() {
        setLoading(true);
        try {
            const payload = await apiRequest<KanbanResponse>('/api/v1/kanban/tasks');
            setTasks(payload.data);
            setStatuses(payload.meta.statuses);
            setPriorities(payload.meta.priorities);
            setError('');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadTasks();
    }, []);

    async function createTask(event: FormEvent) {
        event.preventDefault();
        if (!title.trim()) return;

        try {
            await apiRequest('/api/v1/kanban/tasks', {
                method: 'POST',
                body: JSON.stringify({ title: title.trim(), priority }),
            });
            setTitle('');
            await loadTasks();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to create task.');
        }
    }

    async function moveTask(task: Task, status: string) {
        if (task.status === status) return;

        try {
            await apiRequest(`/api/v1/kanban/tasks/${task.id}/move`, {
                method: 'PATCH',
                body: JSON.stringify({ status, position: 0 }),
            });
            await loadTasks();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to move task.');
        }
    }

    async function deleteTask(id: number) {
        try {
            await apiRequest(`/api/v1/kanban/tasks/${id}`, { method: 'DELETE' });
            setTasks((current) => current.filter((task) => task.id !== id));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to delete task.');
        }
    }

    const statusEntries = useMemo(() => Object.entries(statuses), [statuses]);

    return (
        <main className="workspace">
            <div className="workspace-heading">
                <div>
                    <p className="eyebrow">React migration</p>
                    <h1>Kanban workspace</h1>
                </div>
                <form className="task-form" onSubmit={createTask}>
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="New task title"
                        aria-label="New task title"
                    />
                    <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Task priority">
                        {Object.entries(priorities).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <button type="submit">Add task</button>
                </form>
            </div>
            {error && <p className="error-banner">{error}</p>}
            {loading ? (
                <p className="muted">Loading tasks...</p>
            ) : (
                <div className="kanban-board">
                    {statusEntries.map(([status, label]) => (
                        <section
                            className="kanban-column"
                            key={status}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                const taskId = Number(event.dataTransfer.getData('task-id'));
                                const task = tasks.find((item) => item.id === taskId);
                                if (task) void moveTask(task, status);
                            }}
                        >
                            <header>
                                <h2>{label}</h2>
                                <span>{tasks.filter((task) => task.status === status).length}</span>
                            </header>
                            {tasks.filter((task) => task.status === status).map((task) => (
                                <article
                                    className="task-card"
                                    draggable
                                    key={task.id}
                                    onDragStart={(event) => event.dataTransfer.setData('task-id', String(task.id))}
                                >
                                    <div className="task-card-heading">
                                        <strong>{task.title}</strong>
                                        <button type="button" onClick={() => void deleteTask(task.id)} aria-label={`Delete ${task.title}`}>×</button>
                                    </div>
                                    <small className={`priority priority-${task.priority}`}>
                                        {priorities[task.priority] ?? task.priority}
                                    </small>
                                    {task.assignee && <small className="muted">{task.assignee}</small>}
                                </article>
                            ))}
                        </section>
                    ))}
                </div>
            )}
        </main>
    );
}
