import { useState } from 'react';
import { waApi } from '../services/api';
import './BroadcastPanel.css';

export default function BroadcastPanel({ status, onSent }) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState('');

  const send = async () => {
    if (!phone.trim() || !message.trim()) return;
    try {
      await waApi.sendMessage(phone, message);
      setInfo('Pesan berhasil dikirim.');
      setPhone('');
      setMessage('');
      onSent?.();
    } catch (e) {
      setInfo(`Gagal: ${e.message}`);
    }
  };

  return (
    <div className="broadcast-panel-card">
      <h3 className="broadcast-title">Broadcast / Kirim Pesan WhatsApp</h3>
      {!status?.logged_in && (
        <div className="broadcast-warning">
          WhatsApp belum login — silakan scan QR code terlebih dahulu.
        </div>
      )}
      <div className="broadcast-form-grid">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Nomor HP Tujuan (cth: 628xxxxxxxxx)"
          className="broadcast-input"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Isi Pesan Broadcast..."
          className="broadcast-textarea"
        />
        <button onClick={send} className="broadcast-submit-btn">
          Kirim Pesan
        </button>
      </div>
      {info && <p className="broadcast-info-msg">{info}</p>}
    </div>
  );
}
