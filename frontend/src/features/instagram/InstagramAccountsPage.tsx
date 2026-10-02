import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Account = {
    username: string;
    display_name: string | null;
    status: string;
    last_checked_at: string | null;
};

export function InstagramAccountsPage() {
    const [account, setAccount] = useState<Account | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function loadAccount() {
        try {
            const result = await apiRequest<{ data: Account | null }>('/api/v1/instagram/account');
            setAccount(result.data);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load the account.');
        }
    }

    useEffect(() => {
        void loadAccount();
    }, []);

    async function login(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await apiRequest<{ data: Account }>('/api/v1/instagram/account/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            setAccount(result.data);
            setUsername('');
            setPassword('');
            setMessage('Instagram account connected.');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to connect the account.');
        } finally {
            setBusy(false);
        }
    }

    async function checkAccount() {
        setBusy(true);
        setError('');
        try {
            const result = await apiRequest<{ data: Account | null }>('/api/v1/instagram/account/check', { method: 'POST' });
            setAccount(result.data);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to check the account.');
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        setBusy(true);
        setError('');
        try {
            await apiRequest('/api/v1/instagram/account/logout', { method: 'POST' });
            setAccount((current) => current ? { ...current, status: 'logged_out' } : null);
            setMessage('Instagram account disconnected.');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to disconnect the account.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="workspace account-workspace">
            <p className="eyebrow">React migration</p>
            <h1>Instagram accounts</h1>
            <div className="account-layout">
                <form className="account-card" onSubmit={login}>
                    <h2>Connect account</h2>
                    <label>
                        Username
                        <input value={username} onChange={(event) => setUsername(event.target.value)} required />
                    </label>
                    <label>
                        Password
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                    </label>
                    <button type="submit" disabled={busy}>{busy ? 'Connecting...' : 'Connect account'}</button>
                </form>
                <section className="account-card">
                    <h2>Account status</h2>
                    {account ? (
                        <>
                            <p className="account-name">@{account.username}</p>
                            <p className="muted">{account.display_name ?? 'Instagram account'}</p>
                            <p>Status: <strong>{account.status}</strong></p>
                            <p className="muted">Last check: {account.last_checked_at ?? 'Not checked'}</p>
                            <div className="account-actions">
                                <button type="button" onClick={() => void checkAccount()} disabled={busy}>Check status</button>
                                <button type="button" onClick={() => void logout()} disabled={busy}>Disconnect</button>
                            </div>
                        </>
                    ) : (
                        <p className="muted">No Instagram account connected.</p>
                    )}
                </section>
            </div>
            {message && <p className="success-banner">{message}</p>}
            {error && <p className="error-banner">{error}</p>}
        </main>
    );
}
