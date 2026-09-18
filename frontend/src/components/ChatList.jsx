import React, { useState, useMemo } from 'react';
import './ChatList.css';

export default function ChatList({ chats, activeJID, onSelectChat }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('semua'); // 'semua' | 'perhatian' | 'otonom'

  // Standard preset meta mapping for contacts if dynamic items need enrichment
  const presets = useMemo(() => ({
    '6281329401122': {
      avatar: 'SR',
      avatarColor: 'red',
      tag: 'BCA',
      phone: '+62 813-2940-1122',
      pills: [
        { label: '🚨 Nego Ekstrem (-24.1%)', type: 'danger' },
        { label: 'Manual Taken', type: 'manual' },
      ],
      isAttention: true,
      isOtonom: false,
    },
    '6281277198801': {
      avatar: 'BA',
      avatarColor: 'indigo',
      tag: null,
      phone: '+62 812-7719-8801',
      pills: [{ label: '⚡ AI Dijawab Otomatis', type: 'ai' }],
      isAttention: false,
      isOtonom: true,
    },
    '6285643091198': {
      avatar: 'MD',
      avatarColor: 'slate',
      tag: null,
      phone: '+62 856-4309-1198',
      pills: [{ label: '⚠️ Komplain Logistik', type: 'warning' }],
      isAttention: true,
      isOtonom: false,
    },
    '6287810023490': {
      avatar: 'AP',
      avatarColor: 'emerald',
      tag: null,
      phone: '+62 878-1002-3490',
      pills: [{ label: '✅ Order Validated', type: 'validated' }],
      isAttention: false,
      isOtonom: true,
    },
  }), []);

  // Format initials from name
  const getInitials = (name) => {
    if (!name) return 'WA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filtered & enriched chat list
  const filteredChats = useMemo(() => {
    if (!chats) return [];

    return chats.map((chat) => {
      const cleanPhone = (chat.phone || chat.jid || '').replace(/\D/g, '');
      const preset = presets[cleanPhone] || {};

      const name = chat.sender_name || chat.phone || chat.jid || 'Pelanggan WhatsApp';
      const avatar = preset.avatar || getInitials(name);
      const avatarColor = preset.avatarColor || 'indigo';
      const tag = preset.tag || null;
      const phone = preset.phone || (chat.phone ? `+${chat.phone}` : chat.jid);
      const lastMessage = chat.last_message || 'Bisa minta nomor rekening..';
      const time = chat.timestamp ? chat.timestamp.split(' ')[1]?.slice(0, 5) || '12:33' : '12:33';
      const pills = preset.pills || [{ label: '⚡ AI Active', type: 'ai' }];
      const isAttention = preset.isAttention || false;
      const isOtonom = preset.isOtonom || true;

      return {
        ...chat,
        displayName: name,
        avatar,
        avatarColor,
        tag,
        formattedPhone: phone,
        displayMessage: lastMessage,
        displayTime: time,
        pills,
        isAttention,
        isOtonom,
      };
    }).filter((c) => {
      // Search filter
      const matchesSearch =
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.formattedPhone.includes(searchQuery) ||
        c.displayMessage.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      if (activeFilter === 'perhatian') return c.isAttention;
      if (activeFilter === 'otonom') return c.isOtonom;
      return true;
    });
  }, [chats, searchQuery, activeFilter, presets]);

  return (
    <div className="chat-list-container">
      {/* Header Search & Category Filter */}
      <div className="chat-list-header">
        <div className="chat-search-box">
          <svg className="chat-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor, nama pelanggan.."
            className="chat-search-input"
          />
        </div>

        {/* Category Tabs */}
        <div className="chat-filter-tabs">
          <button
            onClick={() => setActiveFilter('semua')}
            className={`chat-filter-btn ${activeFilter === 'semua' ? 'active' : ''}`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveFilter('perhatian')}
            className={`chat-filter-btn ${activeFilter === 'perhatian' ? 'active attention' : ''}`}
          >
            Perhatian
            <span className="chat-filter-badge">3</span>
          </button>
          <button
            onClick={() => setActiveFilter('otonom')}
            className={`chat-filter-btn ${activeFilter === 'otonom' ? 'active' : ''}`}
          >
            Otonom
          </button>
        </div>
      </div>

      {/* Chat List Scrollable Area */}
      <div className="chat-list-scroll">
        {filteredChats.length === 0 ? (
          <div className="chat-list-empty">Tidak ada chat ditemukan.</div>
        ) : (
          <ul className="chat-list-ul">
            {filteredChats.map((c) => (
              <li key={c.jid}>
                <button
                  onClick={() => onSelectChat(c.jid)}
                  className={`chat-item-btn ${c.jid === activeJID ? 'active' : ''}`}
                >
                  {/* Initials Avatar */}
                  <div className={`chat-item-avatar ${c.avatarColor}`}>
                    {c.avatar}
                    <span className="chat-avatar-status-dot"></span>
                  </div>

                  {/* Main Chat Item Details */}
                  <div className="chat-item-main">
                    <div className="chat-item-top-row">
                      <div className="chat-item-name-group">
                        <span className="chat-item-name">{c.displayName}</span>
                        {c.tag && <span className="chat-item-tag">{c.tag}</span>}
                      </div>
                      <span className="chat-item-time">{c.displayTime}</span>
                    </div>

                    <div className="chat-item-phone">{c.formattedPhone}</div>
                    <div className="chat-item-preview">{c.displayMessage}</div>

                    {/* Status Pills */}
                    <div className="chat-item-pill-row">
                      {c.pills.map((pill, idx) => (
                        <span key={idx} className={`chat-pill ${pill.type}`}>
                          {pill.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
