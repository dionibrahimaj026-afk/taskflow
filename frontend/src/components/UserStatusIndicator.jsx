export default function UserStatusIndicator({ isOnline, className = '', size = 8 }) {
  return (
    <span
      className={`d-inline-block rounded-circle ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: isOnline ? 'var(--bs-success)' : 'var(--bs-secondary)',
        flexShrink: 0,
      }}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
