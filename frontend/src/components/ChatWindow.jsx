import React, { useEffect, useState, useRef } from 'react';
import { waApi } from '../services/api';
import './ChatWindow.css';

export default function ChatWindow({ jid, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isManualMode, setIsManualMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Default preset timeline messages for demo/mockup alignment if API returns empty
  const defaultMockTimeline = [
    {
      id: 'm1',
      sender: 'Siti Rahma (Pembeli)',
      time: '12:20',
      type: 'buyer',
      text: 'Halo kak, Batik Biru Pekalongan ukuran L masih ada stoknya?',
    },
    {
      id: 'm2',
      sender: '🤖 TokoPilot AI',
      time: '12:21 · Otomatis',
      type: 'ai',
      text: (
        <>
          Halo Kak Siti! Batik Biru Pekalongan ukuran L masih tersedia <span className="highlight-green">14 pcs</span> siap kirim hari ini ya kak 😁. Harga normal <span className="highlight-green">Rp 145.000 / pcs</span> dengan jaminan bahan katun primisima halus.
        </>
      ),
    },
    {
      id: 'm3',
      sender: 'Siti Rahma (Pembeli)',
      time: '12:25',
      type: 'buyer',
      text: 'Kalau ambil 5 pcs bisa dapat Rp 110.000 per pcs nggak kak? Sekalian buat seragam arisan.',
    },
    {
      id: 'm4',
      type: 'guardrail',
      title: 'AI GUARDRAIL TRUNCATED',
      badge: '-24.1% Tawaran',
      text: 'TokoPilot mendeteksi tawaran diskon Rp 110.000 (24.1%), melebihi batas toleransi toko (maks. 15%). AI menahan respon otomatis dan mengalihkan kendali penuh ke Owner.',
    },
    {
      id: 'm5',
      sender: '👤 Hendra (Owner)',
      time: '12:30 · Manual Takeover',
      type: 'owner',
      text: (
        <>
          Halo Bu Siti, untuk pembelian 5 pcs Batik Biru kami bisa kasih harga spesial grosir <span className="highlight-green">Rp 125.000 per pcs</span> dan gratis ongkir se-Jawa. Bagaimana bu?
        </>
      ),
    },
    {
      id: 'm6',
      sender: 'Siti Rahma (Pembeli)',
      time: '12:32',
      type: 'buyer',
      text: 'Wah boleh kak! Total jadi berapa ya?',
    },
    {
      id: 'm7',
      sender: 'Siti Rahma (Pembeli)',
      time: '12:33',
      type: 'buyer',
      text: 'Bisa minta nomor rekening BCA tokonya?',
    },
    {
      id: 'm8',
      type: 'system-bar',
      text: '⏸️ TokoPilot AI dijeda — Menunggu balasan manual Anda...',
    },
  ];

  // Fetch messages from API whenever JID changes
  useEffect(() => {
    if (!jid) return;
    setLoading(true);
    waApi
      .getMessages(jid)
      .then((res) => {
        setMessages(res.data || []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [jid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!jid) {
    return (
      <div className="chat-window-placeholder">
        <div className="chat-window-placeholder-icon">💬</div>
        <h3>Pilih Chat Pelanggan</h3>
        <p>Pilih percakapan WhatsApp dari daftar sebelah kiri untuk melihat dialog.</p>
      </div>
    );
  }

  // Send message via API
  const send = async () => {
    if (!text.trim()) return;
    const msgToSend = text;
    setText('');

    // Optimistic UI update
    const tempMsg = {
      id: Date.now(),
      message_text: msgToSend,
      from_me: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await waApi.sendMessage(jid, msgToSend);
      const res = await waApi.getMessages(jid).catch(() => null);
      if (res?.data) {
        setMessages(res.data);
      }
      onMessageSent?.();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Determine display messages
  const hasApiMessages = messages && messages.length > 0;

  return (
    <div className="chat-window-container">
      {/* Active Chat Header */}
      <div className="chat-header-bar">
        <div className="chat-header-left">
          <div className="chat-header-avatar">
            SR
            <span className="chat-header-avatar-dot"></span>
          </div>
          <div className="chat-header-info">
            <div className="chat-header-title-row">
              <span className="chat-header-name">Siti Rahma</span>
              <span className="chat-header-escalation-pill">
                🚨 Eskalasi Nego
              </span>
            </div>
            <div className="chat-header-sub-row">
              <span>+62 813-2940-1122</span>
              <span>·</span>
              <span className="chat-header-platform-tag">💬 WhatsApp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Timeline */}
      <div className="chat-timeline">
        <div className="chat-date-divider">Hari ini, 24 Oktober 2024</div>

        {/* If API has real messages, render them; otherwise render the rich mock timeline */}
        {hasApiMessages ? (
          messages.map((m) => (
            <div key={m.id || m.message_id} className={`chat-message-row ${m.from_me ? 'owner' : 'buyer'}`}>
              <div className={`chat-message-sender-meta ${m.from_me ? 'owner' : 'buyer'}`}>
                {m.from_me ? (
                  <span className="sender-pill-owner">👤 Owner · Manual</span>
                ) : (
                  <span>{m.sender_name || 'Pembeli'}</span>
                )}
                <span>{m.timestamp || ''}</span>
              </div>
              <div className={`chat-bubble ${m.from_me ? 'owner' : 'buyer'}`}>
                {m.message_text}
              </div>
            </div>
          ))
        ) : (
          defaultMockTimeline.map((item) => {
            if (item.type === 'guardrail') {
              return (
                <div key={item.id} className="chat-guardrail-banner">
                  <div className="guardrail-header">
                    <span className="guardrail-icon">🛡️</span>
                    <span className="guardrail-title">{item.title}</span>
                    <span className="guardrail-badge">{item.badge}</span>
                  </div>
                  <p className="guardrail-text">{item.text}</p>
                </div>
              );
            }

            if (item.type === 'system-bar') {
              return (
                <div key={item.id} className="chat-system-bar">
                  {item.text}
                </div>
              );
            }

            return (
              <div key={item.id} className={`chat-message-row ${item.type}`}>
                <div className={`chat-message-sender-meta ${item.type}`}>
                  {item.type === 'ai' && (
                    <span className="sender-pill-ai">{item.sender}</span>
                  )}
                  {item.type === 'owner' && (
                    <span className="sender-pill-owner">{item.sender}</span>
                  )}
                  {item.type === 'buyer' && <span>{item.sender}</span>}
                  <span>{item.time}</span>
                </div>
                <div className={`chat-bubble ${item.type}`}>
                  {item.text}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Control & Input Bar */}
      <div className="chat-input-area-container">
        {/* Manual Mode Banner */}
        <div className="chat-manual-status-banner">
          <div className="manual-banner-left">
            <span className="manual-banner-dot"></span>
            <span>
              {isManualMode
                ? 'Mode Manual Aktif — Anda sedang membalas langsung pelanggan via WhatsApp Cloud API.'
                : 'Mode Otonom AI Aktif — TokoPilot AI membalas otomatis.'}
            </span>
          </div>
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className="toggle-ai-btn"
          >
            {isManualMode ? 'Kembalikan ke AI' : 'Beralih ke Manual'}
          </button>
        </div>

        {/* Input Controls */}
        <div className="chat-input-controls-row">
          <div className="chat-input-box-wrapper">
            <button className="chat-attachment-btn" title="Lampirkan File">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik balasan manual ke Siti Rahma... (Tekan Enter untuk kirim via WhatsApp)"
              className="chat-input-element"
            />
          </div>

          <button onClick={send} className="chat-send-gradient-btn">
            <span>Kirim Pesan</span>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
