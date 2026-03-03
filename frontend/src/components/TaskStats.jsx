import { Card, ProgressBar, Badge } from 'react-bootstrap';

const STATUS_CONFIG = [
  { key: 'Todo', label: 'Todo', variant: 'secondary' },
  { key: 'Active', label: 'Active', variant: 'primary' },
  { key: 'Testing', label: 'Testing', variant: 'info' },
  { key: 'Done', label: 'Done', variant: 'success' },
];

export default function TaskStats({ tasks = [], stats: statsProp, archivedCount = 0, compact = false }) {
  const byStatus = statsProp?.byStatus ?? STATUS_CONFIG.reduce((acc, { key }) => {
    acc[key] = tasks.filter((t) => t.status === key).length;
    return acc;
  }, {});

  const total = statsProp?.total ?? tasks.length;
  const done = statsProp?.done ?? byStatus.Done ?? 0;
  const archived = statsProp?.archived ?? archivedCount;
  const completionPct = statsProp?.completionPct ?? (total > 0 ? Math.round((done / total) * 100) : 0);

  if (compact) {
    return (
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {STATUS_CONFIG.map(({ key, label, variant }) => (
          <Badge key={key} bg={variant} className="me-1">
            {label}: {byStatus[key] || 0}
          </Badge>
        ))}
        {archived > 0 && (
          <Badge bg="light" text="dark">
            Archived: {archived}
          </Badge>
        )}
        {total > 0 && (
          <span className="text-muted small">
            {completionPct}% complete
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="mb-3">
      <Card.Header className="py-2">
        <strong>Task completion</strong>
      </Card.Header>
      <Card.Body className="py-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex gap-2 flex-wrap">
            {STATUS_CONFIG.map(({ key, label, variant }) => (
              <span key={key} className="small">
                <Badge bg={variant} className="me-1">
                  {byStatus[key] || 0}
                </Badge>
                {label}
              </span>
            ))}
            {archived > 0 && (
              <span className="small text-muted">
                <Badge bg="light" text="dark" className="me-1">
                  {archived}
                </Badge>
                archived
              </span>
            )}
          </div>
          <span className="small fw-bold">{completionPct}%</span>
        </div>
        <ProgressBar
          now={completionPct}
          variant="success"
          style={{ height: 6 }}
        />
      </Card.Body>
    </Card>
  );
}
