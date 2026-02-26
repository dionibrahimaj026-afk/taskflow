import { Card, Badge, Button, ListGroup } from 'react-bootstrap';
import { formatDate } from '../utils/dateUtils';

const PRIORITIES = [
  { key: 'Low', label: 'Low', variant: 'secondary' },
  { key: 'Medium', label: 'Medium', variant: 'info' },
  { key: 'High', label: 'High', variant: 'warning' },
  { key: 'Urgent', label: 'Urgent', variant: 'danger' },
];

export default function TaskArchive({ tasks, onRestore, onTaskClick }) {
  if (tasks.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Archive</Card.Header>
        <Card.Body className="text-muted text-center py-4">
          No archived tasks. Archive completed tasks from the Done column to keep your board tidy.
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Archive</span>
        <Badge bg="secondary">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Badge>
      </Card.Header>
      <ListGroup variant="flush">
        {tasks.map((task) => (
          <ListGroup.Item key={task._id} className="d-flex justify-content-between align-items-center py-2">
            <div
              className="flex-grow-1 cursor-pointer"
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
                Archived {formatDate(task.archivedAt || task.updatedAt, { dateStyle: 'short', timeStyle: 'short' })}
                {task.assignedTo?.name && ` · ${task.assignedTo.name}`}
              </small>
            </div>
            <Button variant="outline-primary" size="sm" onClick={() => onRestore?.(task)}>
              Restore
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}
