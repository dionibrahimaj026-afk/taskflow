import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Button, Badge, ListGroup } from 'react-bootstrap';
import { api } from '../utils/api';
import UserStatusIndicator from './UserStatusIndicator';

const MENTION_REGEX = /@\[([^\]]+)\]\(([a-f0-9]+)\)/g;

function parseMentions(text) {
  const mentions = [];
  let m;
  const re = new RegExp(MENTION_REGEX.source, 'g');
  while ((m = re.exec(text)) !== null) {
    mentions.push({ name: m[1], id: m[2] });
  }
  return mentions;
}

function renderCommentText(text, mentionUsers = []) {
  if (!text) return '';
  const parts = [];
  let lastIndex = 0;
  const re = new RegExp(MENTION_REGEX.source, 'g');
  let m;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    parts.push(text.slice(lastIndex, m.index));
    const user = Array.isArray(mentionUsers)
      ? mentionUsers.find((u) => String(u?._id) === m[2])
      : null;
    parts.push(
      <span key={`m-${key++}`} className="badge bg-primary me-1">
        @{user?.name || m[1]}
      </span>
    );
    lastIndex = re.lastIndex;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

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

export default function TaskDetailModal({ task, show, onHide, onCommentAdded, users = [] }) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef(null);

  const handleCommentChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    const beforeCursor = val.slice(0, pos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentionDropdown(true);
      setMentionCursorPos(pos);
    } else {
      setShowMentionDropdown(false);
    }
    setCommentText(val);
  };

  const insertMention = (user) => {
    const pos = mentionCursorPos;
    const before = commentText.slice(0, pos);
    const after = commentText.slice(pos);
    const atStart = before.search(/@\w*$/);
    const insertAt = atStart >= 0 ? atStart : pos;
    const newText =
      commentText.slice(0, insertAt) +
      `@[${user.name}](${user._id})` +
      (after.startsWith(' ') ? '' : ' ') +
      commentText.slice(pos).replace(/^\s*/, '');
    setCommentText(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    const mentions = parseMentions(text).map((m) => m.id);
    setSubmitting(true);
    try {
      const updated = await api.post(`/tasks/${task._id}/comments`, { text, mentions });
      setCommentText('');
      setShowMentionDropdown(false);
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
            <p className="text-muted mb-0 mt-1 d-flex align-items-center gap-2">
              <UserStatusIndicator
                isOnline={users.find((u) => u._id === task.assignedTo?._id)?.isOnline}
              />
              {task.assignedTo.name}
            </p>
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
                <p className="mb-0 small mt-1">{renderCommentText(c.text, c.mentions && c.mentions.length ? c.mentions : users)}</p>
              </div>
            ))
          )}
        </div>

        <Form onSubmit={handleSubmitComment}>
          <Form.Group className="position-relative">
            <Form.Control
              ref={textareaRef}
              as="textarea"
              rows={2}
              placeholder="Add a comment... Type @ to mention someone"
              value={commentText}
              onChange={handleCommentChange}
              onBlur={() => setTimeout(() => setShowMentionDropdown(false), 150)}
              disabled={submitting}
            />
            {showMentionDropdown && users.length > 0 && (
              <ListGroup
                className="position-absolute top-100 start-0 end-0 mt-1 shadow-sm"
                style={{ zIndex: 1050, maxHeight: 160, overflowY: 'auto' }}
              >
                {users
                  .filter(
                    (u) =>
                      !mentionQuery ||
                      (u.name || '').toLowerCase().includes(mentionQuery)
                  )
                  .slice(0, 8)
                  .map((u) => (
                    <ListGroup.Item
                      key={u._id}
                      action
                      className="py-2"
                      onClick={() => insertMention(u)}
                    >
                      {u.name}
                    </ListGroup.Item>
                  ))}
              </ListGroup>
            )}
            <Button type="submit" size="sm" className="mt-2" disabled={!commentText.trim() || submitting}>
              {submitting ? 'Posting...' : 'Add comment'}
            </Button>
          </Form.Group>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
