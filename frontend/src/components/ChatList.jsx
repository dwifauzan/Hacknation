import React from 'react';
import './ChatList.css';

export default function ChatList({ chats, activeJID, onSelectChat }) {
  if (!chats?.length) {
    return <div className="chat-list-empty">Belum ada chat.</div>;
  }

  return (
    <div className="chat-list-container">
      <ul className="chat-list-ul">
        {chats.map((c) => (
          <li key={c.jid}>
            <button
              onClick={() => onSelectChat(c.jid)}
              className={`chat-list-btn ${c.jid === activeJID ? 'active' : ''}`}
            >
              <div className="chat-sender-name">
                {c.sender_name || c.phone || c.jid}
              </div>
              <div className="chat-last-message">
                {c.last_message}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
