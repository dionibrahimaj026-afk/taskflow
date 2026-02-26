import { Card, Badge, Button, ListGroup } from 'react-bootstrap';
import { formatDate, parseDate } from '../utils/dateUtils';

const TRASH_RETENTION_DAYS = 30;
const PRIORITIES = [
  { key: 'Low', label: 'Low', variant: 'secondary' },
  { key: 'Medium', label: 'Medium', variant: 'info' },
  { key: 'High', label: 'High', variant: 'warning' },
  { key: 'Urgent', label: 'Urgent', variant: 'danger' },
];

function daysUntilPermanentDelete(deletedAt) {
  const d = parseDate(deletedAt);
  if (!d) return null;
  const permanentDate = new Date(d);
  permanentDate.setDate(permanentDate.getDate() + TRASH_RETENTION_DAYS);
  const now = new Date();
  const daysLeft = Math.ceil((permanentDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
}

export default function TaskTrash({ tasks, onRestore, onPermanentDelete, onTaskClick, searchQuery }) {
  if (tasks.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Trash</Card.Header>
        <Card.Body className="text-muted text-center py-4">
          {searchQuery
            ? 'No deleted tasks match your search.'
            : 'No deleted tasks. Deleted tasks are kept for 30 days before permanent removal.'}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Trash</span>
        <Badge bg="secondary">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Badge>
      </Card.Header>
      <Card.Body className="small text-muted">
        Tasks are permanently deleted after {TRASH_RETENTION_DAYS} days.
      </Card.Body>
      <ListGroup variant="flush">
        {tasks.map((task) => {
          const daysLeft = daysUntilPermanentDelete(task.deletedAt);
          return (
            <ListGroup.Item key={task._id} className="d-flex justify-content-between align-items-start py-2">
              <div
                className="flex-grow-1"
                style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                onClick={() => onTaskClick?.(task)}
              >
                <strong>{task.title}</strong>
                <Badge
                  bg={PRIORITIES.find((p) => p.key === (task.priority || 'Medium'))?.variant || 'secondary'}
                  className="ms-2"
                >
                  {task.priority || 'Medium'}
                </Badge>
                <small className="text-muted d-block mt-1">
                  Deleted {formatDate(task.deletedAt, { dateStyle: 'short', timeStyle: 'short' })}
                  {task.assignedTo?.name && ` · ${task.assignedTo.name}`}
                </small>
                {daysLeft !== null && (
                  <small className="d-block text-warning">
                    {daysLeft > 0
                      ? `Permanently deleted in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                      : 'Will be permanently deleted soon'}
                  </small>
                )}
              </div>
              <div className="d-flex gap-1">
                <Button variant="outline-primary" size="sm" onClick={() => onRestore?.(task)}>
                  Restore
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => onPermanentDelete?.(task)}>
                  Delete
                </Button>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
