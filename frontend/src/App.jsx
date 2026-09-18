import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { waApi } from './services/api';
import './App.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import BroadcastPanel from './components/BroadcastPanel';
import LoginModal from './components/LoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [chats, setChats] = useState([]);
  const [activeJID, setActiveJID] = useState(null);

  const [status, setStatus] = useState({
    connected: false,
    logged_in: false,
  });

  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load Chats
  const loadChats = useCallback(async () => {
    try {
      const data = await waApi.getChats();
      setChats(data || []);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, []);

  // Load WhatsApp Status
  const loadStatus = useCallback(async () => {
    try {
      const res = await waApi.getStatus();
      setStatus(
        res || {
          connected: false,
          logged_in: false,
        }
      );
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      await waApi.logout();
      await loadStatus();
      setShowLoginModal(true);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [loadStatus]);

  // WebSocket Message Handler
  const handleWSMessage = useCallback(
    (msg) => {
      if (msg.type === 'new_message') {
        loadChats();
      }

      if (msg.type === 'status_update') {
        setStatus((prev) => ({
          ...prev,
          ...msg.data,
        }));

        if (
          msg.data.status === 'connected' ||
          msg.data.status === 'paired' ||
          msg.data.logged_in
        ) {
          setShowLoginModal(false);
        }
      }

      if (msg.type === 'history_synced') {
        loadChats();
      }
    },
    [loadChats]
  );

  useWebSocket(handleWSMessage);

  // Initial Data Fetch
  useEffect(() => {
    loadChats();
    loadStatus();
  }, [loadChats, loadStatus]);

  return (
    <div className="tokopilot-app">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Area */}
      <div className="tokopilot-main-area">
        <Header status={status} onLoginClick={() => setShowLoginModal(true)} />

        <main className="tokopilot-main-content">
          <div className="tokopilot-content-container">
            {/* Overview */}
            {activeTab === 'overview' && (
              <DashboardOverview
                status={status}
                chatsCount={chats.length}
                onLoginClick={() => setShowLoginModal(true)}
                onLogoutClick={handleLogout}
              />
            )}

            {/* Chat */}
            {activeTab === 'chat' && (
              <section className="tokopilot-chat-section">
                <div className="tokopilot-chat-sidebar-col">
                  <ChatList
                    chats={chats}
                    activeJID={activeJID}
                    onSelectChat={setActiveJID}
                  />
                </div>
                <div className="tokopilot-chat-window-col">
                  <ChatWindow jid={activeJID} onMessageSent={loadChats} />
                </div>
              </section>
            )}

            {/* Broadcast */}
            {activeTab === 'broadcast' && (
              <section className="tokopilot-broadcast-section">
                <BroadcastPanel status={status} onSent={loadChats} />
              </section>
            )}

            {/* AI Settings */}
            {activeTab === 'ai-settings' && (
              <section className="tokopilot-ai-settings-section">
                <div className="ai-settings-icon-box">⚙</div>
                <h2 className="ai-settings-title">AI Settings & Automation</h2>
                <p className="ai-settings-desc">
                  TokoPilot AI automatically responds to incoming customer messages across connected channels.
                </p>
                <div className="ai-settings-status-pill">
                  <span className="pill-dot"></span>
                  Agent Operational
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Login / QR Modal */}
      {showLoginModal && (
        <LoginModal status={status} onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}