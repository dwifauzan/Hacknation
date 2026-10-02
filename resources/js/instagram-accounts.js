const accountApi = '/api/v1/instagram/account';
const accountElements = {
    form: document.querySelector('#loginForm'),
    loginButton: document.querySelector('#loginButton'),
    checkButton: document.querySelector('#checkButton'),
    logoutButton: document.querySelector('#logoutButton'),
    card: document.querySelector('#accountCard'),
    pill: document.querySelector('#statusPill'),
    alert: document.querySelector('#accountAlert'),
};

async function accountRequest(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Instagram request failed.');
    return data;
}

function showAlert(message, type = 'error') {
    accountElements.alert.textContent = message;
    accountElements.alert.className = `mb-5 rounded-xl border px-4 py-3 text-sm ${type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`;
    accountElements.alert.classList.remove('hidden');
}

function renderAccount(account) {
    const connected = account && account.status === 'connected';
    accountElements.pill.textContent = connected ? 'Connected' : (account?.status || 'Not connected');
    accountElements.pill.className = `rounded-full px-3 py-1 text-xs ${connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`;
    accountElements.logoutButton.classList.toggle('hidden', !account);
    accountElements.card.innerHTML = account
        ? `<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-400 text-2xl font-bold">${(account.username || '?')[0].toUpperCase()}</div>
           <h3 class="mt-4 text-lg font-bold">@${escapeHtml(account.username)}</h3>
           <p class="mt-1 text-sm text-slate-400">${escapeHtml(account.display_name || 'Instagram account')}</p>
           <div class="mt-5 grid grid-cols-2 gap-3 text-left text-xs"><div class="rounded-xl bg-slate-950 p-3"><p class="text-slate-500">Status</p><p class="mt-1 font-semibold text-slate-200">${escapeHtml(account.status)}</p></div><div class="rounded-xl bg-slate-950 p-3"><p class="text-slate-500">Last check</p><p class="mt-1 font-semibold text-slate-200">${escapeHtml(account.last_checked_at || 'Not checked')}</p></div></div>`
        : 'No Instagram account connected.';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

async function checkAccount() {
    try {
        const result = await accountRequest(`${accountApi}/check`, { method: 'POST' });
        renderAccount(result.data);
    } catch (error) { showAlert(error.message); }
}

accountElements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    accountElements.loginButton.disabled = true;
    accountElements.loginButton.textContent = 'Connecting...';
    try {
        const result = await accountRequest(`${accountApi}/login`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
        event.target.reset();
        renderAccount(result.data);
        showAlert('Instagram account connected successfully.', 'success');
    } catch (error) { showAlert(error.message); }
    finally { accountElements.loginButton.disabled = false; accountElements.loginButton.textContent = 'Connect account'; }
});
accountElements.checkButton.addEventListener('click', checkAccount);
accountElements.logoutButton.addEventListener('click', async () => {
    if (!window.confirm('Disconnect this Instagram account?')) return;
    try { await accountRequest(`${accountApi}/logout`, { method: 'POST' }); renderAccount(null); showAlert('Instagram account disconnected.', 'success'); }
    catch (error) { showAlert(error.message); }
});
accountRequest(accountApi).then((result) => renderAccount(result.data)).catch((error) => showAlert(error.message));
