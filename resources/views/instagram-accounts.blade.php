<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>HackNation - Instagram Account</title>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100">
    <main class="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        @include('partials.workspace-nav')

        <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
                <a href="/" class="text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-400 hover:text-fuchsia-300">HackNation workspace</a>
                <h1 class="mt-2 text-3xl font-bold">Instagram account</h1>
                <p class="mt-1 text-sm text-slate-400">Connect one account securely and monitor its saved session.</p>
            </div>
            <a href="/" class="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Back to dashboard</a>
        </header>

        <div id="accountAlert" class="mb-5 hidden rounded-xl border px-4 py-3 text-sm"></div>
        <section class="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
                <div class="mb-6 flex items-center gap-4">
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-2xl font-bold">◎</div>
                    <div><p class="text-xs font-semibold uppercase tracking-widest text-fuchsia-400">Account connection</p><h2 class="mt-1 text-xl font-bold">Login Instagram</h2></div>
                </div>
                <form id="loginForm" class="space-y-4">
                    <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Username</span><input name="username" required autocomplete="username" placeholder="your_username" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-fuchsia-500"></label>
                    <label class="block text-sm"><span class="mb-1.5 block text-slate-300">Password</span><input type="password" name="password" required autocomplete="current-password" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-fuchsia-500"></label>
                    <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">Your password is used only for this login request. It is never stored by Laravel. Instagram may request approval or 2FA in the official app.</div>
                    <button id="loginButton" class="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-rose-500 px-4 py-3 font-semibold transition hover:from-fuchsia-500 hover:to-rose-400">Connect account</button>
                </form>
            </div>
            <aside class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
                <div class="mb-6 flex items-center justify-between"><div><p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Connected account</p><h2 class="mt-1 text-xl font-bold">Account status</h2></div><span id="statusPill" class="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">Checking</span></div>
                <div id="accountCard" class="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No Instagram account connected.</div>
                <div class="mt-5 flex gap-3"><button id="checkButton" class="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800">Check session</button><button id="logoutButton" class="hidden flex-1 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10">Disconnect</button></div>
            </aside>
        </section>
    </main>
    @vite(['resources/css/app.css', 'resources/js/instagram-accounts.js'])
</body>
</html>
