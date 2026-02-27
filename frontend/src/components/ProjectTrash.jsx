import { Card, Badge, Button, ListGroup } from 'react-bootstrap';
import { formatDate, parseDate } from '../utils/dateUtils';
import { canEditProject, canPermanentDeleteProject } from '../utils/projectRoles';

const TRASH_RETENTION_DAYS = 30;

function daysUntilPermanentDelete(deletedAt) {
  const d = parseDate(deletedAt);
  if (!d) return null;
  const permanentDate = new Date(d);
  permanentDate.setDate(permanentDate.getDate() + TRASH_RETENTION_DAYS);
  const now = new Date();
  const daysLeft = Math.ceil((permanentDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysLeft);
}

export default function ProjectTrash({ projects, onRestore, onPermanentDelete, user }) {
  if (projects.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Trash</Card.Header>
        <Card.Body className="text-muted text-center py-4">
          No deleted projects. Deleted projects are kept for 30 days before permanent removal.
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Trash</span>
        <Badge bg="secondary">{projects.length} project{projects.length !== 1 ? 's' : ''}</Badge>
      </Card.Header>
      <Card.Body className="small text-muted">
        Projects are permanently deleted after {TRASH_RETENTION_DAYS} days.
      </Card.Body>
      <ListGroup variant="flush">
        {projects.map((p) => {
          const daysLeft = daysUntilPermanentDelete(p.deletedAt);
          const canRestore = user && canEditProject(p, user.id);
          const canPermanentDelete = user && canPermanentDeleteProject(p, user.id);
          return (
            <ListGroup.Item key={p._id} className="d-flex justify-content-between align-items-start py-2">
              <div className="flex-grow-1">
                <strong>{p.title}</strong>
                <small className="text-muted d-block mt-1">
                  Deleted {formatDate(p.deletedAt, { dateStyle: 'short', timeStyle: 'short' })}
                  {p.createdBy?.name && ` · Created by ${p.createdBy.name}`}
                </small>
                {daysLeft !== null && (
                  <small className="d-block text-warning">
                    {daysLeft > 0
                      ? `Permanently deleted in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                      : 'Will be permanently deleted soon'}
                  </small>
                )}
              </div>
              {(canRestore || canPermanentDelete) && (
                <div className="d-flex gap-1">
                  {canRestore && (
                    <Button variant="outline-primary" size="sm" onClick={() => onRestore?.(p)}>
                      Restore
                    </Button>
                  )}
                  {canPermanentDelete && (
                    <Button variant="outline-danger" size="sm" onClick={() => onPermanentDelete?.(p)}>
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
