import { Alert } from 'react-bootstrap';

export default function ErrorMessage({ message, onDismiss, dismissible = true, className = '' }) {
  if (!message) return null;

  return (
    <Alert
      variant="danger"
      dismissible={dismissible && !!onDismiss}
      onClose={onDismiss}
      className={`d-flex align-items-center mb-3 ${className}`}
      style={{
        borderLeft: '4px solid var(--bs-danger)',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <span className="me-2" aria-hidden>⚠️</span>
      <span>{message}</span>
    </Alert>
  );
}
