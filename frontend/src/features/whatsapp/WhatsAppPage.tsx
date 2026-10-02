import { FormEvent, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Chat = {
    jid: string;
    sender_name: string;
    last_message: string;
    timestamp: string;
};

type Message = {
    id: number;
    sender_name: string;
    message_text: string;
    from_me: boolean;
    timestamp: string;
};

type WhatsAppStatus = {
    connected?: boolean;
    logged_in?: boolean;
    jid?: string;
};

export function WhatsAppPage() {
    const [status, setStatus] = useState<WhatsAppStatus>({});
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeJid, setActiveJid] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [error, setError] = useState('');
    const socketRef = useRef<WebSocket | null>(null);
    const activeJidRef = useRef('');

    async function loadStatus() {
        const result = await apiRequest<WhatsAppStatus>('/api/v1/whatsapp/status');
        setStatus(result);
    }

    async function loadChats() {
        const result = await apiRequest<{ data: Chat[] }>('/api/v1/whatsapp/chats');
        setChats(result.data ?? []);
    }

    async function loadMessages(jid: string) {
        const result = await apiRequest<{ data: Message[] }>(`/api/v1/whatsapp/messages?jid=${encodeURIComponent(jid)}`);
        setMessages(result.data ?? []);
    }

    async function loadQr() {
        const response = await fetch(`${(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/v1/whatsapp/qr`);
        if (!response.ok) throw new Error('Unable to load the WhatsApp QR code.');
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('image/')) {
            if (qrUrl) URL.revokeObjectURL(qrUrl);
            setQrUrl(URL.createObjectURL(await response.blob()));
        }
    }

    useEffect(() => {
        void Promise.all([loadStatus(), loadChats(), loadQr()]).catch((requestError) => {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load WhatsApp.');
        });

        const websocketHost = import.meta.env.VITE_WHATSAPP_WS_URL ?? 'ws://localhost:8080/ws';
        const socket = new WebSocket(websocketHost);
        socketRef.current = socket;
        socket.onmessage = () => {
            void loadChats();
            if (activeJidRef.current) void loadMessages(activeJidRef.current);
        };
        socket.onerror = () => setError('WhatsApp realtime connection is unavailable.');

        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        activeJidRef.current = activeJid;
    }, [activeJid]);

    useEffect(() => () => {
        if (qrUrl) URL.revokeObjectURL(qrUrl);
    }, [qrUrl]);

    async function selectChat(jid: string) {
        setActiveJid(jid);
        setTarget(jid.split('@')[0]);
        try {
            await loadMessages(jid);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load messages.');
        }
    }

    async function sendMessage(event: FormEvent) {
        event.preventDefault();
        if (!target.trim() || !message.trim()) return;
        try {
            await apiRequest('/api/v1/whatsapp/messages', {
                method: 'POST',
                body: JSON.stringify({ target, pesan: message }),
            });
            setMessage('');
            await loadChats();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to send message.');
        }
    }

    async function logout() {
        try {
            await apiRequest('/api/v1/whatsapp/logout', { method: 'POST' });
            await loadStatus();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to log out.');
        }
    }

    return (
        <main className="workspace whatsapp-workspace">
            <div className="workspace-heading">
                <div>
                    <p className="eyebrow">React migration</p>
                    <h1>WhatsApp workspace</h1>
                    <p className="muted">Status: {status.logged_in ? 'Connected' : 'Not connected'}</p>
                </div>
                <div className="account-actions">
                    <button type="button" onClick={() => void loadQr()}>Refresh QR</button>
                    <button type="button" onClick={() => void logout()}>Logout</button>
                </div>
            </div>
            {error && <p className="error-banner">{error}</p>}
            <div className="whatsapp-grid">
                <aside className="chat-list">
                    <h2>Chats</h2>
                    {chats.map((chat) => (
                        <button
                            className={`chat-item ${chat.jid === activeJid ? 'selected' : ''}`}
                            key={chat.jid}
                            type="button"
                            onClick={() => void selectChat(chat.jid)}
                        >
                            <strong>{chat.sender_name || chat.jid}</strong>
                            <small>{chat.last_message}</small>
                        </button>
                    ))}
                    {chats.length === 0 && <p className="muted">No chats available.</p>}
                </aside>
                <section className="message-panel">
                    {activeJid ? (
                        <>
                            <h2>{activeJid}</h2>
                            <div className="messages">
                                {messages.map((item) => (
                                    <div className={`message-bubble ${item.from_me ? 'outgoing' : ''}`} key={item.id}>
                                        <span>{item.message_text}</span>
                                        <small>{item.timestamp}</small>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            {qrUrl ? <img src={qrUrl} alt="WhatsApp pairing QR code" /> : <p>Select a chat or scan the QR code.</p>}
                        </div>
                    )}
                    <form className="message-form" onSubmit={sendMessage}>
                        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target phone" aria-label="Target phone" />
                        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message" aria-label="Message" />
                        <button type="submit">Send</button>
                    </form>
                </section>
            </div>
        </main>
    );
}
