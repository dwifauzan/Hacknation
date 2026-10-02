<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>HackNation - Kanban</title>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100">
    <main class="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
        @include('partials.workspace-nav')

        <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                <a href="/" class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400 hover:text-emerald-300">HackNation workspace</a>
                <h1 class="mt-2 text-3xl font-bold">Project Kanban</h1>
                <p class="mt-1 text-sm text-slate-400">A simple, durable flow for planning and delivering repository work.</p>
            </div>
            <button id="newTaskButton" type="button" class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500">+ New task</button>
        </header>

        <div id="boardStatus" class="mb-4 hidden rounded-xl border px-4 py-3 text-sm"></div>
        <section id="board" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-live="polite"></section>
    </main>

    <div id="taskModal" class="fixed inset-0 z-10 hidden items-center justify-center bg-black/70 p-4">
        <form id="taskForm" class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div class="mb-5 flex items-center justify-between">
                <h2 id="taskModalTitle" class="text-lg font-bold">Create task</h2>
                <button type="button" data-modal-close class="text-slate-400 hover:text-white" aria-label="Close">✕</button>
            </div>
            <input type="hidden" name="id">
            <div class="space-y-4">
                <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Title</span><input name="title" required maxlength="160" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500"></label>
                <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Description</span><textarea name="description" maxlength="5000" rows="4" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500"></textarea></label>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Status</span><select name="status" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"></select></label>
                    <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Priority</span><select name="priority" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"></select></label>
                    <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Assignee</span><input name="assignee" maxlength="100" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500"></label>
                </div>
                <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Due date</span><input type="date" name="due_date" class="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"></label>
            </div>
            <div class="mt-6 flex justify-end gap-3">
                <button type="button" data-modal-close class="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
                <button id="taskSubmit" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Create task</button>
            </div>
        </form>
    </div>
    @vite(['resources/css/app.css', 'resources/js/kanban.js'])
</body>
</html>
