import { Card, Badge, Button, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import { canEditProject } from '../utils/projectRoles';

export default function ProjectArchive({ projects, onRestore, onDelete, user }) {
  if (projects.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Archive</Card.Header>
        <Card.Body className="text-muted text-center py-4">
          No archived projects. Archive completed projects to keep your dashboard tidy.
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>Archive</span>
        <Badge bg="secondary">{projects.length} project{projects.length !== 1 ? 's' : ''}</Badge>
      </Card.Header>
      <ListGroup variant="flush">
        {projects.map((p) => {
          const canManage = user && canEditProject(p, user.id);
          return (
            <ListGroup.Item key={p._id} className="d-flex justify-content-between align-items-center py-2">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <strong>{p.title}</strong>
                  {p.finishRating && (
                    <span className="text-warning" title={`Rated ${p.finishRating}/5`}>
                      {"★".repeat(p.finishRating)}
                      <span className="text-muted small">({p.finishRating}/5)</span>
                    </span>
                  )}
                </div>
                <small className="text-muted d-block mt-1">
                  Archived {formatDate(p.archivedAt || p.updatedAt, { dateStyle: 'short', timeStyle: 'short' })}
                  {p.createdBy?.name && ` · Created by ${p.createdBy.name}`}
                </small>
              </div>
              <div className="d-flex gap-1">
                <Button as={Link} to={`/project/${p._id}`} variant="outline-primary" size="sm">
                  Open
                </Button>
                {canManage && (
                  <>
                    <Button variant="outline-primary" size="sm" onClick={() => onRestore?.(p)}>
                      Restore
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => onDelete?.(p)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
