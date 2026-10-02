type InstagramPayload = Record<string, unknown>;

const instagramServiceUrl = (process.env.INSTAGRAM_SERVICE_URL ?? 'http://localhost:8090').replace(/\/$/, '');

export class InstagramServiceError extends Error {
    constructor(
        message: string,
        public readonly status = 503,
    ) {
        super(message);
    }
}

async function request(path: string, options: RequestInit = {}): Promise<InstagramPayload> {
    let response: Response;
    try {
        response = await fetch(`${instagramServiceUrl}${path}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });
    } catch {
        throw new InstagramServiceError('Instagram service is unavailable.');
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message = typeof payload?.message === 'string'
            ? payload.message
            : typeof payload?.detail === 'string'
                ? payload.detail
                : 'Instagram service request failed.';
        throw new InstagramServiceError(message, response.status);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new InstagramServiceError('Instagram service returned an invalid response.');
    }

    return payload as InstagramPayload;
}

export function login(username: string, password: string) {
    return request('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function status() {
    return request('/status');
}

export function logout() {
    return request('/logout', { method: 'POST' });
}
