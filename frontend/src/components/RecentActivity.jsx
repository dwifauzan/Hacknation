import React from 'react';
import './RecentActivity.css';

export default function RecentActivity() {
  const activities = [
    {
      id: 1,
      channel: 'Shopee',
      iconClass: 'shopee',
      iconSymbol: '🏷️',
      text: 'dm dari follower a bertanya ....',
      time: '2m ago',
      isFailed: false,
    },
    {
      id: 2,
      channel: 'WhatsApp',
      iconClass: 'whatsapp',
      iconSymbol: '💬',
      text: 'dm dari nomer siti rahma bertanya ....',
      time: '8m ago',
      isFailed: false,
    },
    {
      id: 3,
      channel: 'Instagram',
      iconClass: 'instagram',
      iconSymbol: '📷',
      text: 'dm dari account a bertanya ....',
      time: '14m ago',
      isFailed: false,
    },
    {
      id: 4,
      channel: 'Message Failed',
      iconClass: 'failed',
      iconSymbol: '🔔',
      text: 'Failed to dm account a on Instagram',
      time: '20m ago',
      isFailed: true,
    },
    {
      id: 5,
      channel: 'AI TokoPilot',
      iconClass: 'ai',
      iconSymbol: '⚡',
      text: 'Start to activity messaging all dm one by one',
      time: '42m ago',
      isFailed: false,
    },
  ];

  return (
    <div className="recent-activity-card">
      <div className="activity-header">
        <div>
          <h2 className="activity-title">Recent Activity</h2>
          <p className="activity-subtitle">
            Automated actions executed by TokoPilot without needing manual intervention
          </p>
        </div>
        <button className="activity-history-link">
          Go to see History AI →
        </button>
      </div>

      <div className="activity-list">
        {activities.map((act) => (
          <div key={act.id} className="activity-item">
            <div className="activity-item-left">
              <div className={`activity-icon ${act.iconClass}`}>
                {act.iconSymbol}
              </div>
              <div className="activity-details">
                <span className="activity-channel-name">{act.channel}</span>
                <span className={`activity-preview ${act.isFailed ? 'failed-text' : ''}`}>
                  {act.text}
                </span>
              </div>
            </div>
            <span className="activity-timestamp">{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
