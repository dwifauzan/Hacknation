const WA_BASE = import.meta.env.VITE_WA_API_URL || 'http://localhost:8080';
const LARAVEL_BASE = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8001/api';

async function sendRequest(baseUrl, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP Error ${res.status} pada ${path}`);
  }
  return res.json();
}

// 1. WhatsApp Go Microservice API
export const waApi = {
  getStatus: () => sendRequest(WA_BASE, '/status'),
  
  getChats: async () => {
    const res = await sendRequest(WA_BASE, '/chats');
    return res.data || [];
  },

  getMessages: (jid, beforeId = null) => {
    let path = `/messages?jid=${encodeURIComponent(jid)}`;
    if (beforeId) path += `&before_id=${beforeId}`;
    return sendRequest(WA_BASE, path);
  },

  sendMessage: (phone, message) => {
    const cleanPhone = phone.replace('@s.whatsapp.net', '').replace('@lid', '');
    return sendRequest(WA_BASE, '/send-wa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, message }),
    });
  },

  logout: () => sendRequest(WA_BASE, '/logout', { method: 'POST' }),
};

// ── Backward-compat named exports (dipakai App.jsx saat ini) ──
// App.jsx memanggil getChats()/getStatus() langsung; arahkan ke waApi.
export const getStatus = () => waApi.getStatus();
export const getChats = async () => {
  const data = await waApi.getChats();
  return { status: 'success', data };
};
export const getMessages = (jid, beforeId) => waApi.getMessages(jid, beforeId);
export const sendMessage = (phone, message) => waApi.sendMessage(phone, message);

// 2. Laravel Business API
// NOTE: endpoint /products /orders /activity-logs belum ada di Laravel
// (butuh routes/api.php). Selama belum ada, panggilan ini akan 404.
export const laravelApi = {
  getProducts: () => sendRequest(LARAVEL_BASE, '/products'),
  createProduct: (data) =>
    sendRequest(LARAVEL_BASE, '/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getOrders: () => sendRequest(LARAVEL_BASE, '/orders'),
  getActivityLogs: () => sendRequest(LARAVEL_BASE, '/activity-logs'),
};