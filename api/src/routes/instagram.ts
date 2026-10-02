import { Router, type Response } from 'express';
import { database } from '../db.js';
import {
    InstagramServiceError,
    login,
    logout,
    status,
} from '../services/instagram.js';

const router = Router();

function now() {
    return new Date().toISOString();
}

function latestAccount() {
    return database.prepare('SELECT * FROM instagram_accounts ORDER BY id DESC LIMIT 1').get();
}

function sendServiceError(response: Response, error: unknown) {
    if (error instanceof InstagramServiceError) {
        return response.status(error.status).json({ message: error.message, status: 'error' });
    }
    throw error;
}

router.get('/account', (_request, response) => {
    return response.json({ data: latestAccount() ?? null });
});

router.post('/account/login', async (request, response) => {
    const { username, password } = request.body as Record<string, unknown>;
    if (
        typeof username !== 'string'
        || !/^[A-Za-z0-9._]+$/.test(username)
        || username.length > 100
        || typeof password !== 'string'
        || password.length === 0
        || password.length > 256
    ) {
        return response.status(422).json({ message: 'A valid Instagram username and password are required.' });
    }

    try {
        const result = await login(username, password);
        const timestamp = now();
        database.prepare(`
            INSERT INTO instagram_accounts
                (username, display_name, instagram_user_id, status, session_reference, last_checked_at, last_error, created_at, updated_at)
            VALUES (?, ?, ?, 'connected', ?, ?, NULL, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                display_name = excluded.display_name,
                instagram_user_id = excluded.instagram_user_id,
                status = excluded.status,
                session_reference = excluded.session_reference,
                last_checked_at = excluded.last_checked_at,
                last_error = NULL,
                updated_at = excluded.updated_at
        `).run(
            typeof result.username === 'string' ? result.username : username,
            typeof result.display_name === 'string' ? result.display_name : null,
            typeof result.user_id === 'string' ? result.user_id : null,
            typeof result.session_reference === 'string' ? result.session_reference : null,
            timestamp,
            timestamp,
            timestamp,
        );

        return response.json({ data: latestAccount() });
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.post('/account/check', async (_request, response) => {
    const account = latestAccount() as { id: number } | undefined;
    if (!account) return response.json({ data: null });

    try {
        const result = await status();
        database.prepare(`
            UPDATE instagram_accounts
            SET status = ?, last_checked_at = ?, last_error = NULL, updated_at = ?
            WHERE id = ?
        `).run(
            typeof result.status === 'string' ? result.status : 'connected',
            now(),
            now(),
            account.id,
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Instagram status check failed.';
        database.prepare(`
            UPDATE instagram_accounts
            SET status = 'error', last_checked_at = ?, last_error = ?, updated_at = ?
            WHERE id = ?
        `).run(now(), message, now(), account.id);
    }

    return response.json({ data: latestAccount() });
});

router.post('/account/logout', async (_request, response) => {
    try {
        await logout();
    } catch (error) {
        return sendServiceError(response, error);
    }

    const account = latestAccount() as { id: number } | undefined;
    if (account) {
        database.prepare(`
            UPDATE instagram_accounts
            SET status = 'logged_out', session_reference = NULL, last_checked_at = ?, updated_at = ?
            WHERE id = ?
        `).run(now(), now(), account.id);
    }

    return response.json({ status: 'logged_out' });
});

export default router;
