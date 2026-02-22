import { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner } from 'react-bootstrap';
import { api } from '../utils/api';

const ACTION_LABELS = {
  'project.created': 'created the project',
  'project.updated': 'updated the project',
  'project.deleted': 'deleted the project',
  'task.created': 'created task',
  'task.updated': 'updated task',
  'task.deleted': 'deleted task',
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function ActivityLog({ projectId, refreshKey = 0 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/activities/project/${projectId}`);
        if (!cancelled) setActivities(data);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, refreshKey]);

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Header>Activity</Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header>Activity</Card.Header>
      <ListGroup variant="flush">
        {activities.length === 0 ? (
          <ListGroup.Item className="text-muted">No activity yet</ListGroup.Item>
        ) : (
          activities.map((a) => (
            <ListGroup.Item key={a._id} className="py-2">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{a.user?.name || 'Someone'}</strong>{' '}
                  {ACTION_LABELS[a.action] || a.action}
                  {a.entityType === 'task' && a.entityTitle && (
                    <span className="text-muted"> "{a.entityTitle}"</span>
                  )}
                  {a.details && a.action === 'task.updated' && (
                    <span className="text-muted"> — {a.details}</span>
                  )}
                </div>
                <small className="text-muted">{formatTime(a.createdAt)}</small>
              </div>
            </ListGroup.Item>
          ))
        )}
      </ListGroup>
    </Card>
  );
}
