import React, { useState, useEffect } from 'react';
import './LoginModal.css';

const WA_BASE = import.meta.env.VITE_WA_API_URL || 'http://localhost:8080';

export default function LoginModal({ onClose, status }) {
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const refreshQR = () => {
    setLoading(true);
    setQrTimestamp(Date.now());
    setTimeout(() => setLoading(false), 800);
  };

  useEffect(() => {
    const interval = setInterval(refreshQR, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status?.connected || status?.logged_in) {
      onClose();
    }
  }, [status, onClose]);

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-card">
        <button onClick={onClose} className="login-modal-close-btn" title="Tutup">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="login-modal-header-icon">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.999 1.592-1.056 3.856 3.794-.995.996.614z"/>
          </svg>
        </div>

        <h3 className="login-modal-title">Scan QR WhatsApp</h3>
        <p className="login-modal-instructions">
          Buka WhatsApp di HP Anda ➔ Pengaturan ➔ Perangkat Tertaut ➔ Tautkan Perangkat
        </p>

        {/* QR Display Frame */}
        <div className="login-qr-frame">
          {loading ? (
            <div className="login-qr-loading">
              <div className="login-spinner"></div>
              <span>Memuat QR Code...</span>
            </div>
          ) : (
            <img
              src={`${WA_BASE}/qr?t=${qrTimestamp}`}
              alt="QR Code WhatsApp"
              className="login-qr-image"
              onError={(e) => {
                if (!e.target.src.includes('/wa/qr')) {
                  e.target.src = `/wa/qr?t=${qrTimestamp}`;
                }
              }}
            />
          )}
        </div>

        <div className="login-modal-actions">
          <button onClick={refreshQR} className="login-refresh-btn">
            <svg className={loading ? 'animate-spin' : ''} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh QR Code
          </button>
          <button onClick={onClose} className="login-cancel-btn">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
