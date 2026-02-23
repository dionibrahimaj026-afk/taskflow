import { useState } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import { api } from '../utils/api';

const COLUMNS = [
  { key: 'Todo', label: 'Todo', variant: 'secondary' },
  { key: 'Active', label: 'Active', variant: 'primary' },
  { key: 'Testing', label: 'Testing', variant: 'info' },
  { key: 'Done', label: 'Done', variant: 'success' },
];

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
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function TaskDetailModal({ task, show, onHide, onCommentAdded }) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const updated = await api.post(`/tasks/${task._id}/comments`, { text });
      setCommentText('');
      onCommentAdded?.(updated);
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) return null;

  const comments = task.comments || [];

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          {task.title}
          <Badge bg={COLUMNS.find((c) => c.key === task.status)?.variant || 'secondary'}>
            {task.status}
          </Badge>
          <Badge bg="secondary">{task.priority || 'Medium'}</Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <strong>Description</strong>
          <p className="text-muted mb-0 mt-1">{task.description || 'No description'}</p>
        </div>

        {task.assignedTo && (
          <div className="mb-4">
            <strong>Assigned to</strong>
            <p className="text-muted mb-0 mt-1">{task.assignedTo.name}</p>
          </div>
        )}

        {task.subtasks?.length > 0 && (
          <div className="mb-4">
            <strong>Subtasks</strong>
            <ul className="mb-0 mt-1">
              {(task.subtasks || []).map((st, i) => (
                <li key={i} className={st.completed ? 'text-decoration-line-through text-muted' : ''}>
                  {st.title} {st.completed && '✓'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr />
        <h6 className="mb-3">Comments</h6>

        <div className="mb-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <p className="text-muted small">No comments yet. Add one to document what you&apos;ve done.</p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="mb-3 p-2 rounded bg-light">
                <div className="d-flex justify-content-between align-items-start">
                  <strong className="small">{c.user?.name || 'Someone'}</strong>
                  <span className="text-muted small">{formatTime(c.createdAt)}</span>
                </div>
                <p className="mb-0 small mt-1">{c.text}</p>
              </div>
            ))
          )}
        </div>

        <Form onSubmit={handleSubmitComment}>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Add a comment about what you've done..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={submitting}
            />
            <Button type="submit" size="sm" className="mt-2" disabled={!commentText.trim() || submitting}>
              {submitting ? 'Posting...' : 'Add comment'}
            </Button>
          </Form.Group>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
