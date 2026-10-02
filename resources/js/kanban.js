const API_URL = '/api/v1/kanban/tasks';
const DEFAULT_STATUSES = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const DEFAULT_PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const PRIORITY_CLASSES = { low: 'text-slate-400', medium: 'text-blue-400', high: 'text-amber-400', urgent: 'text-red-400' };

const state = {
    tasks: [],
    statuses: DEFAULT_STATUSES,
    priorities: DEFAULT_PRIORITIES,
    editingId: null,
};

const elements = {
    board: document.querySelector('#board'),
    boardStatus: document.querySelector('#boardStatus'),
    modal: document.querySelector('#taskModal'),
    form: document.querySelector('#taskForm'),
    modalTitle: document.querySelector('#taskModalTitle'),
    submit: document.querySelector('#taskSubmit'),
};

async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        ...options,
    });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(payload?.message || 'Kanban request failed.');
    return payload;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[character]));
}

function render() {
    elements.board.innerHTML = Object.entries(state.statuses).map(([status, label]) => {
        const tasks = state.tasks.filter((task) => task.status === status);
        return `
            <section data-status="${status}" class="flex min-h-[520px] flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
                ondragover="event.preventDefault()" ondrop="window.kanbanDrop(event, '${status}')">
                <header class="mb-3 flex items-center justify-between px-2">
                    <div><h2 class="font-semibold">${escapeHtml(label)}</h2><p class="text-xs text-slate-500">${tasks.length} task${tasks.length === 1 ? '' : 's'}</p></div>
                    <span class="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">${tasks.length}</span>
                </header>
                <div class="space-y-3">${tasks.map(renderTask).join('')}</div>
            </section>`;
    }).join('');
}

function renderTask(task) {
    const priorityClass = PRIORITY_CLASSES[task.priority] || PRIORITY_CLASSES.medium;
    const dueDate = task.due_date ? `<span class="text-slate-500">Due ${escapeHtml(task.due_date)}</span>` : '';
    return `
        <article draggable="true" ondragstart="event.dataTransfer.setData('task-id', '${task.id}')"
            class="cursor-grab rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/50">
            <div class="mb-3 flex items-start justify-between gap-3">
                <button type="button" data-edit-task="${task.id}" class="text-left text-sm font-semibold hover:text-emerald-300">${escapeHtml(task.title)}</button>
                <button type="button" data-delete-task="${task.id}" class="text-xs text-slate-600 hover:text-red-400" aria-label="Delete task">✕</button>
            </div>
            ${task.description ? `<p class="mb-4 line-clamp-3 text-xs leading-relaxed text-slate-400">${escapeHtml(task.description)}</p>` : ''}
            <div class="flex items-center justify-between gap-2 text-[11px]"><span class="font-semibold uppercase ${priorityClass}">${escapeHtml(state.priorities[task.priority] || task.priority)}</span><span class="truncate text-slate-500">${escapeHtml(task.assignee || 'Unassigned')}</span></div>
            ${dueDate ? `<div class="mt-3 text-[11px]">${dueDate}</div>` : ''}
        </article>`;
}

function showStatus(message, type = 'error') {
    elements.boardStatus.textContent = message;
    elements.boardStatus.className = `mb-4 rounded-xl border px-4 py-3 text-sm ${type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`;
    elements.boardStatus.classList.remove('hidden');
    window.setTimeout(() => elements.boardStatus.classList.add('hidden'), 4000);
}

function openModal(task = null) {
    state.editingId = task?.id || null;
    elements.form.reset();
    elements.modalTitle.textContent = task ? 'Edit task' : 'Create task';
    elements.submit.textContent = task ? 'Save changes' : 'Create task';
    populateSelect(elements.form.status, state.statuses, task?.status || 'backlog');
    populateSelect(elements.form.priority, state.priorities, task?.priority || 'medium');
    if (task) Object.entries(task).forEach(([key, value]) => { if (elements.form.elements[key]) elements.form.elements[key].value = value ?? ''; });
    elements.modal.classList.remove('hidden');
    elements.modal.classList.add('flex');
    elements.form.title.focus();
}

function closeModal() {
    elements.modal.classList.add('hidden');
    elements.modal.classList.remove('flex');
    state.editingId = null;
}

function populateSelect(select, options, selected) {
    select.innerHTML = Object.entries(options).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

async function loadTasks() {
    const payload = await request(API_URL);
    state.tasks = payload.data || [];
    state.statuses = payload.meta?.statuses || DEFAULT_STATUSES;
    state.priorities = payload.meta?.priorities || DEFAULT_PRIORITIES;
    render();
}

async function saveTask(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(elements.form));
    delete payload.id;
    try {
        const url = state.editingId ? `${API_URL}/${state.editingId}` : API_URL;
        await request(url, { method: state.editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        closeModal();
        await loadTasks();
        showStatus(state.editingId ? 'Task updated.' : 'Task created.', 'success');
    } catch (error) { showStatus(error.message); }
}

async function moveTask(event, status) {
    const taskId = Number(event.dataTransfer.getData('task-id'));
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    const previousStatus = task.status;
    task.status = status;
    render();
    try {
        await request(`${API_URL}/${taskId}/move`, { method: 'PATCH', body: JSON.stringify({ status, position: 0 }) });
        await loadTasks();
    } catch (error) {
        task.status = previousStatus;
        render();
        showStatus(error.message);
    }
}

async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return;
    try {
        await request(`${API_URL}/${id}`, { method: 'DELETE' });
        state.tasks = state.tasks.filter((task) => task.id !== id);
        render();
    } catch (error) { showStatus(error.message); }
}

elements.board.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-task]');
    const deleteButton = event.target.closest('[data-delete-task]');
    if (editButton) openModal(state.tasks.find((task) => task.id === Number(editButton.dataset.editTask)));
    if (deleteButton) deleteTask(Number(deleteButton.dataset.deleteTask));
});
elements.form.addEventListener('submit', saveTask);
document.querySelector('#newTaskButton').addEventListener('click', () => openModal());
document.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', closeModal));
window.kanbanDrop = moveTask;
loadTasks().catch((error) => showStatus(error.message));
