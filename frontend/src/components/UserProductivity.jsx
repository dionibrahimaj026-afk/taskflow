import { useState, useEffect } from 'react';
import { Card, ProgressBar, Badge, Spinner } from 'react-bootstrap';
import { api } from '../utils/api';

const STATUS_CONFIG = [
  { key: 'Todo', label: 'Todo', variant: 'secondary' },
  { key: 'Active', label: 'Active', variant: 'primary' },
  { key: 'Testing', label: 'Testing', variant: 'info' },
  { key: 'Done', label: 'Done', variant: 'success' },
];

export default function UserProductivity() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/users/me/productivity');
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
        </Card.Body>
      </Card>
    );
  }

  if (!stats) return null;

  const { tasksAssigned, tasksDone, tasksByStatus, completionRate, tasksCreated, commentsAdded } = stats;

  return (
    <Card className="mb-3">
      <Card.Header className="py-2">
        <strong>Productivity stats</strong>
      </Card.Header>
      <Card.Body className="py-2">
        <div className="d-flex flex-wrap gap-3 mb-2">
          <div>
            <span className="text-muted small">Assigned</span>
            <div className="fw-bold">{tasksAssigned}</div>
          </div>
          <div>
            <span className="text-muted small">Completed</span>
            <div className="fw-bold text-success">{tasksDone}</div>
          </div>
          <div>
            <span className="text-muted small">Created</span>
            <div className="fw-bold">{tasksCreated}</div>
          </div>
          <div>
            <span className="text-muted small">Comments</span>
            <div className="fw-bold">{commentsAdded}</div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap mb-2">
          {STATUS_CONFIG.map(({ key, label, variant }) => (
            <Badge key={key} bg={variant}>
              {label}: {tasksByStatus?.[key] ?? 0}
            </Badge>
          ))}
        </div>
        <div className="d-flex align-items-center gap-2">
          <ProgressBar
            now={completionRate}
            variant="success"
            style={{ height: 6, flex: 1 }}
          />
          <span className="small fw-bold">{completionRate}%</span>
        </div>
      </Card.Body>
    </Card>
  );
}
