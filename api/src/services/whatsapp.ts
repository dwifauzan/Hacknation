type WhatsAppPayload = Record<string, unknown>;

const whatsappServiceUrl = (process.env.WHATSAPP_SERVICE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class WhatsAppServiceError extends Error {
    constructor(
        message: string,
        public readonly status = 503,
    ) {
        super(message);
    }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
    try {
        return await fetch(`${whatsappServiceUrl}${path}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
    } catch {
        throw new WhatsAppServiceError('WhatsApp microservice is unavailable.');
    }
}

async function json(path: string, options: RequestInit = {}): Promise<WhatsAppPayload> {
    const response = await request(path, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = typeof payload?.message === 'string'
            ? payload.message
            : 'WhatsApp microservice request failed.';
        throw new WhatsAppServiceError(message, response.status);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new WhatsAppServiceError('WhatsApp microservice returned an invalid response.');
    }
    return payload as WhatsAppPayload;
}

export const whatsapp = {
    status: () => json('/status'),
    logout: () => json('/logout', { method: 'POST' }),
    chats: () => json('/chats'),
    messages: (jid: string, beforeId?: number) => {
        const query = new URLSearchParams({ jid });
        if (beforeId !== undefined) query.set('before_id', String(beforeId));
        return json(`/messages?${query.toString()}`);
    },
    send: (phone: string, message: string) => json('/send-wa', {
        method: 'POST',
        body: JSON.stringify({ phone, message }),
    }),
    qr: () => request('/qr'),
};
