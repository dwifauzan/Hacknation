<div class="mx-auto max-w-7xl px-4 pt-4 lg:px-8">
    <nav class="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-2 shadow-lg" aria-label="Workspace features">
        <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</span>
            <a href="{{ url('/') }}"
               class="rounded-xl px-3.5 py-2 text-sm font-semibold transition {{ request()->is('/') ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white' }}">
                WhatsApp
            </a>
            <a href="{{ route('kanban') }}"
               class="rounded-xl px-3.5 py-2 text-sm font-semibold transition {{ request()->routeIs('kanban') ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white' }}">
                Kanban
            </a>
            <a href="{{ route('instagram.accounts') }}"
               class="rounded-xl px-3.5 py-2 text-sm font-semibold transition {{ request()->routeIs('instagram.accounts') ? 'bg-fuchsia-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white' }}">
                Instagram
            </a>
        </div>
    </nav>
</div>
