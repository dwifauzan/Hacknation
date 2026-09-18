import { useEffect, useState } from 'react';
import { waApi } from '../services/api';
import './ChatWindow.css';

export default function ChatWindow({ jid, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!jid) return;
    waApi.getMessages(jid).then((res) => setMessages(res.data || [])).catch(() => setMessages([]));
  }, [jid]);

  if (!jid) return <div className="chat-window-placeholder">Pilih chat di sebelah kiri untuk melihat percakapan.</div>;

  const send = async () => {
    if (!text.trim()) return;
    await waApi.sendMessage(jid, text);
    setText('');
    const res = await waApi.getMessages(jid).catch(() => null);
    if (res) setMessages(res.data || []);
    onMessageSent?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  return (
    <div className="chat-window-container">
      <div className="chat-window-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.from_me ? 'me' : 'them'}`}>
            <div className={`chat-bubble ${m.from_me ? 'me' : 'them'}`}>
              {m.message_text}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-window-input-bar">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan..."
          className="chat-input-field"
        />
        <button onClick={send} className="chat-send-btn">
          Kirim
        </button>
      </div>
    </div>
  );
}
