export default function StatusBadge({ status }) {
  const online = status?.logged_in || status?.connected;
  return <span>{online ? '🟢 Online' : '🔴 Offline'}</span>;
}
