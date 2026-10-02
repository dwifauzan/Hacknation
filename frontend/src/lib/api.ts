const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${apiBaseUrl}${path}`, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
        throw new Error(payload?.message ?? 'The API request failed.');
    }

    return payload as T;
}
