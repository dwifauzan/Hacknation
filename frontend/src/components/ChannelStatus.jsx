import React from 'react';
import './ChannelStatus.css';

export default function ChannelStatus({ status, onLoginClick, onLogoutClick }) {
  const isWaConnected = status?.logged_in || status?.connected;

  return (
    <div className="channel-status-card">
      <div>
        <div className="channel-header">
          <h2 className="channel-title">Channel Status</h2>
          <p className="channel-subtitle">Real-time sync connections</p>
        </div>

        <div className="channel-list">
          {/* Instagram */}
          <div className="channel-row">
            <div className="channel-left">
              <div className="channel-icon-box instagram">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="1.6" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="1.6" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" />
                </svg>
              </div>
              <span className="channel-name">Instagram</span>
            </div>

            <div className="channel-status-info">
              <span className="channel-status-dot connected" />
              <span className="channel-status-text connected">Connected</span>
              <span className="channel-synced-time">· Synced 2m ago</span>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="channel-row">
            <div className="channel-left">
              <div className="channel-icon-box whatsapp">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.16 5.335 5.496 0 12.05 0c3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z" />
                </svg>
              </div>
              <div>
                <span className="channel-name">WhatsApp</span>
                {isWaConnected && status?.jid && (
                  <p className="channel-jid">{status.jid}</p>
                )}
              </div>
            </div>

            {isWaConnected ? (
              <div className="channel-status-info">
                <span className="channel-status-dot connected" />
                <span className="channel-status-text connected">Connected</span>
                <span className="channel-synced-time">· Synced 4m ago</span>
                {onLogoutClick && (
                  <button onClick={onLogoutClick} className="channel-logout-btn">
                    Logout
                  </button>
                )}
              </div>
            ) : (
              <div className="channel-status-info">
                <span className="channel-status-dot disconnected" />
                <span className="channel-status-text disconnected">Disconnected</span>
                <button onClick={onLoginClick} className="channel-qr-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Login / Generate QR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="channel-manage-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 6V3m0 18v-3M6 12H3m18 0h-3M7.76 7.76L5.64 5.64m12.72 12.72l-2.12-2.12M7.76 16.24l-2.12 2.12M18.36 5.64l-2.12 2.12" />
        </svg>
        Manage Channels
      </button>
    </div>
  );
}
