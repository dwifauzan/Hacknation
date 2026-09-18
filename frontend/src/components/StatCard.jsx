import React from 'react';
import './StatCard.css';

export default function StatCard({ title, value, badgeText, isSync, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-value-row">
          <span className="stat-card-value">{value}</span>
          {!isSync && badgeText && (
            <span className="stat-card-badge">{badgeText}</span>
          )}
        </div>
        {isSync && badgeText && (
          <div className="stat-card-badge sync">
            <span className="sync-dot"></span>
            <span>{badgeText}</span>
          </div>
        )}
      </div>

      <div className="stat-card-icon-box">
        {icon}
      </div>
    </div>
  );
}
