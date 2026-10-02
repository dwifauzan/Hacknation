export const kanbanStatuses = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
} as const;

export const kanbanPriorities = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
} as const;

export type KanbanStatus = keyof typeof kanbanStatuses;
export type KanbanPriority = keyof typeof kanbanPriorities;
