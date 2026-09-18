import React from 'react';
import './Header.css';

export default function Header({ status, onLoginClick }) {
  const isWaConnected = status?.logged_in || status?.connected;

  return (
    <header className="tokopilot-header">
      {/* Title */}
      <div className="header-title-area">
        <div className="header-title-icon">⚡</div>
        <span className="header-title-text">UMKM Commerce Cockpit</span>
      </div>

      {/* Right side controls */}
      <div className="header-right-area">
        {/* Store badge */}
        <div className="header-store-badge">
          <span className={`header-status-dot ${isWaConnected ? 'connected' : 'disconnected'}`} />
          <span className="header-store-text">Toko Batik & Kopi Nusantara</span>
        </div>

        {/* Profile Avatar */}
        <button onClick={onLoginClick} className="header-avatar-btn" title="Profile / WhatsApp Status">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </header>
  );
}