import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activeTab, onTabChange }) {
  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
          />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Checking DM Chat',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 014 11.5a8.5 8.5 0 1117 0z"
          />
        </svg>
      ),
    },
    {
      id: 'ai-settings',
      label: 'AI Settings',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06-1.5 1.5-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V20h-2.12v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06-1.5-1.5.06-.06A1.65 1.65 0 007.4 15a1.65 1.65 0 00-1.51-1H5.8v-2.12h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06 1.5-1.5.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V6h2.12v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06 1.5 1.5-.06.06A1.65 1.65 0 0019.4 10a1.65 1.65 0 001.51 1H21v2.12h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className="tokopilot-sidebar">
      <div>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-brand-title">TokoPilot</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Agent Status */}
      <div className="sidebar-footer">
        <div className="sidebar-status-row">
          <span className="sidebar-status-dot"></span>
          <span className="sidebar-status-label">Agent Active</span>
        </div>
        <p className="sidebar-store-name">Toko Batik & Kopi</p>
      </div>
    </aside>
  );
}