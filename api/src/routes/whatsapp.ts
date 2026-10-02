import { Router, type Response } from 'express';
import { whatsapp, WhatsAppServiceError } from '../services/whatsapp.js';

const router = Router();

function sendServiceError(response: Response, error: unknown) {
    if (error instanceof WhatsAppServiceError) {
        return response.status(error.status).json({ status: 'error', message: error.message });
    }
    throw error;
}

router.get('/status', async (_request, response) => {
    try {
        return response.json(await whatsapp.status());
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.get('/qr', async (_request, response) => {
    try {
        const upstream = await whatsapp.qr();
        const body = Buffer.from(await upstream.arrayBuffer());
        response.status(upstream.status);
        response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return response.send(body);
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.post('/logout', async (_request, response) => {
    try {
        return response.json(await whatsapp.logout());
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.get('/chats', async (_request, response) => {
    try {
        return response.json(await whatsapp.chats());
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.get('/messages', async (request, response) => {
    const jid = request.query.jid;
    const beforeIdValue = request.query.before_id;
    const beforeId = beforeIdValue === undefined ? undefined : Number(beforeIdValue);

    if (
        typeof jid !== 'string'
        || jid.length === 0
        || jid.length > 255
        || (beforeId !== undefined && (!Number.isInteger(beforeId) || beforeId < 1))
    ) {
        return response.status(422).json({ message: 'A valid jid and before_id are required.' });
    }

    try {
        return response.json(await whatsapp.messages(jid, beforeId));
    } catch (error) {
        return sendServiceError(response, error);
    }
});

router.post('/messages', async (request, response) => {
    const { target, pesan } = request.body as Record<string, unknown>;
    if (
        typeof target !== 'string'
        || target.length > 30
        || !/^[0-9+() .-]+$/.test(target)
        || typeof pesan !== 'string'
        || pesan.length === 0
        || pesan.length > 4096
    ) {
        return response.status(422).json({ message: 'A valid target and message are required.' });
    }

    try {
        return response.json(await whatsapp.send(target, pesan));
    } catch (error) {
        return sendServiceError(response, error);
    }
});

export default router;
