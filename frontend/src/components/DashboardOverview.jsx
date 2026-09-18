import React from 'react';
import StatCard from './StatCard';
import RecentActivity from './RecentActivity';
import ChannelStatus from './ChannelStatus';
import './DashboardOverview.css';

export default function DashboardOverview({
  status,
  chatsCount,
  onLoginClick,
  onLogoutClick,
}) {
  const todayDate = new Date()
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
    .toUpperCase();

  return (
    <div className="dashboard-overview">
      {/* Greeting Header */}
      <div className="overview-greeting-row">
        <div className="overview-badges-line">
          <span className="overview-date-badge">TODAY, {todayDate}</span>
          <span className="overview-agent-badge">
            <span className="agent-dot"></span>
            Agent Active
          </span>
        </div>
        <h1 className="overview-greeting-title">
          Good morning, Toko Batik & Kopi
        </h1>
        <p className="overview-greeting-subtitle">
          Here's what TokoPilot has handled for your store today.
        </p>
      </div>

      {/* KPI Statistic Cards */}
      <div className="overview-stat-grid">
        <StatCard
          title="PESAN CHAT YANG DITERIMA HARI INI"
          value={chatsCount > 0 ? chatsCount : 128}
          badgeText="↑ +12%"
          isSync={false}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        <StatCard
          title="TOTAL JUMLAH PESAN PADA 1 MINGGU INI"
          value="42 active"
          badgeText="All in sync"
          isSync={true}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* Content Columns: Recent Activity & Channel Status */}
      <div className="overview-main-grid">
        <RecentActivity />
        <ChannelStatus
          status={status}
          onLoginClick={onLoginClick}
          onLogoutClick={onLogoutClick}
        />
      </div>
    </div>
  );
}