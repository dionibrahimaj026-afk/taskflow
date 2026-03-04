import { useState, useEffect, useRef } from 'react';
import { Button, Modal, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import ErrorMessage from '../components/ErrorMessage';
import { Link, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getProjectRole, canEditProject, canManageMembers } from '../utils/projectRoles';
import { toDateTimeLocal, formatDate, parseDate } from '../utils/dateUtils';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskArchive from '../components/TaskArchive';
import TaskStats from '../components/TaskStats';
import ActivityLog from '../components/ActivityLog';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'Medium', subtasks: [] });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [projectForm, setProjectForm] = useState({});
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [trashedTasks, setTrashedTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const fetchProject = async () => {
    try {
      const data = await api.get(`/projects/${id}`);
      setProject(data);
      setProjectForm({
        title: data?.title ?? '',
        description: data?.description ?? '',
        dueDate: toDateTimeLocal(data?.dueDate),
        members: data?.members ?? [],
        finishRating: data?.finishRating ?? null,
      });
    } catch (err) {
      setError(err?.message || 'Failed to load project');
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await api.get(`/tasks/project/${id}`);
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    }
  };

  const fetchArchivedTasks = async () => {
    try {
      const data = await api.get(`/tasks/project/${id}/archive`);
      setArchivedTasks(data);
    } catch (err) {
      setArchivedTasks([]);
    }
  };

  const fetchTrashedTasks = async () => {
    try {
      const data = await api.get(`/tasks/project/${id}/trash`);
      setTrashedTasks(data);
    } catch (err) {
      setTrashedTasks([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get('/users/list');
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchTasks(), fetchArchivedTasks(), fetchTrashedTasks()]);
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const editable = user && project && canEditProject(project, user.id);
        if (editable && !showTaskModal) setShowTaskModal(true);
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, project, showTaskModal]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/tasks', {
        ...taskForm,
        project: id,
        assignedTo: taskForm.assignedTo || undefined,
        subtasks: taskForm.subtasks || [],
      });
      setTaskForm({ title: '', description: '', assignedTo: '', priority: 'Medium', subtasks: [] });
      setNewSubtaskTitle('');
      setShowTaskModal(false);
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await api.put(`/tasks/${taskId}`, updates);
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to update task');
    }
  };

  const handleArchiveTask = async (task) => {
    try {
      await api.put(`/tasks/${task._id}`, { archived: true });
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to archive task');
    }
  };

  const handleRestoreTask = async (task) => {
    try {
      await api.put(`/tasks/${task._id}`, { archived: false });
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to restore task');
    }
  };

  const handleDeleteTask = async (task) => {
    const taskId = typeof task === 'object' ? task._id : task;
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleRestoreFromTrash = async (task) => {
    try {
      await api.post(`/tasks/${task._id}/restore`);
      fetchTasks();
      fetchArchivedTasks();
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to restore task');
    }
  };

  const handlePermanentDelete = async (task) => {
    if (!confirm('Permanently delete this task? This cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${task._id}/permanent`);
      fetchTrashedTasks();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: projectForm.title,
        description: projectForm.description,
        dueDate: projectForm.dueDate || undefined,
      };
      if (project.archived && 'finishRating' in projectForm) {
        payload.finishRating = projectForm.finishRating ?? null;
      }
      if (canManage && projectForm.members) {
        payload.members = projectForm.members.map((m) => ({
          user: m.user?._id ?? m.user,
          role: m.role || 'editor',
        })).filter((m) => m.user);
      }
      await api.put(`/projects/${id}`, payload);
      setShowEditModal(false);
      fetchProject();
      setActivityRefresh((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!project) {
    return <ErrorMessage message="Project not found" dismissible={false} />;
  }

  const userRole = project.userRole ?? (user ? getProjectRole(project, user.id) : null);
  const canEdit = user && canEditProject(project, user.id);
  const canManage = user && canManageMembers(project, user.id);

  const filterTasks = (list, q) => {
    if (!q?.trim()) return list;
    const lower = q.trim().toLowerCase();
    return list.filter((t) => {
      const matchTitle = t.title?.toLowerCase().includes(lower);
      const matchDesc = t.description?.toLowerCase().includes(lower);
      const matchAssignee = t.assignedTo?.name?.toLowerCase().includes(lower);
      const matchStatus = t.status?.toLowerCase().includes(lower);
      const matchPriority = t.priority?.toLowerCase().includes(lower);
      const matchSubtask = (t.subtasks || []).some((s) => s.title?.toLowerCase().includes(lower));
      return matchTitle || matchDesc || matchAssignee || matchStatus || matchPriority || matchSubtask;
    });
  };

  const filteredTasks = filterTasks(tasks, searchQuery);
  const filteredArchived = filterTasks(archivedTasks, searchQuery);
  const filteredTrash = filterTasks(trashedTasks, searchQuery);


  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Link to="/" className="text-muted text-decoration-none me-2">
            ← Dashboard
          </Link>
          <h1 className="d-inline">{project.title}</h1>
          {user && (
            <Button
              variant="link"
              className="p-0 ms-2"
              style={{ color: project.isFavorite ? 'var(--bs-warning)' : undefined }}
              onClick={async () => {
                try {
                  const res = await api.post(`/projects/${id}/favorite`);
                  setProject((p) => ({ ...p, isFavorite: res.isFavorite }));
                } catch {
                  // ignore
                }
              }}
              title={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {project.isFavorite ? '★' : '☆'}
            </Button>
          )}
          {project.archived && project.finishRating && (
            <span className="text-warning ms-2" title={`Finished rating: ${project.finishRating}/5`}>
              {"★".repeat(project.finishRating)}
              <span className="text-muted small">({project.finishRating}/5)</span>
            </span>
          )}
        </div>
        <div>
          {userRole && (
            <span className="badge bg-secondary me-2" title="Your role in this project">
              {userRole}
            </span>
          )}
          {canEdit && (
            <Button variant="outline-secondary" onClick={() => setShowEditModal(true)}>
              Edit Project
            </Button>
          )}
          {canEdit && (
            <Button variant="primary" className="ms-2" onClick={() => setShowTaskModal(true)} title="Ctrl+N">
              New Task
            </Button>
          )}
          <Button
            variant={showArchive ? 'secondary' : 'outline-secondary'}
            className="ms-2"
            onClick={() => { setShowArchive(!showArchive); setShowTrash(false); }}
          >
            {showArchive ? 'Board' : `Archive (${archivedTasks.length})`}
          </Button>
          <Button
            variant={showTrash ? 'secondary' : 'outline-secondary'}
            className="ms-2"
            onClick={() => { setShowTrash(!showTrash); setShowArchive(false); }}
          >
            {showTrash ? 'Board' : `Trash (${trashedTasks.length})`}
          </Button>
        </div>
      </div>

      {project.description && (
        <p className="text-muted mb-4">{project.description}</p>
      )}
      {(() => {
        const due = parseDate(project.dueDate);
        if (!due) return null;
        return (
          <p className="mb-4">
            <strong>Due:</strong> {formatDate(project.dueDate, { dateStyle: 'medium', timeStyle: 'short' })}
            {due < new Date() && <span className="text-danger ms-2">(overdue)</span>}
          </p>
        );
      })()}

      <ErrorMessage message={error} onDismiss={() => setError('')} />

      <Form.Group className="mb-3">
        <InputGroup>
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control
            ref={searchInputRef}
            type="search"
            placeholder="Search tasks by title, description, assignee... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
              Clear
            </Button>
          )}
        </InputGroup>
      </Form.Group>

      <div className="row">
        <div className="col-lg-8">
          {!showArchive && !showTrash && (
            <TaskStats
              tasks={tasks}
              archivedCount={archivedTasks.length}
            />
          )}
          {searchQuery && filteredTasks.length === 0 && !showArchive && !showTrash && (
            <Alert variant="info">No tasks match your search. Try different keywords.</Alert>
          )}
          {showTrash ? (
            <TaskTrash
              tasks={filteredTrash}
              onRestore={handleRestoreFromTrash}
              onPermanentDelete={handlePermanentDelete}
              onTaskClick={setSelectedTask}
              searchQuery={searchQuery}
            />
          ) : showArchive ? (
            <TaskArchive
              tasks={filteredArchived}
              onRestore={handleRestoreTask}
              onTaskClick={setSelectedTask}
              searchQuery={searchQuery}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              isCreator={canEdit}
              onStatusChange={(task, status) => handleUpdateTask(task._id, { status })}
              onPriorityChange={(task, priority) => handleUpdateTask(task._id, { priority })}
              onSubtasksChange={(task, subtasks) => handleUpdateTask(task._id, { subtasks })}
              onAssigneeChange={(task, assignedTo) => handleUpdateTask(task._id, { assignedTo: assignedTo || null })}
              onDelete={handleDeleteTask}
              onTaskClick={setSelectedTask}
              onArchive={handleArchiveTask}
              users={users}
            />
          )}
        </div>
        <div className="col-lg-4">
          <ActivityLog projectId={id} refreshKey={activityRefresh} />
        </div>
      </div>

      <TaskDetailModal
        task={selectedTask}
        show={!!selectedTask}
        onHide={() => setSelectedTask(null)}
        users={users}
        onCommentAdded={(updatedTask) => {
          setSelectedTask(updatedTask);
          fetchTasks();
          setActivityRefresh((k) => k + 1);
        }}
      />

      {/* New Task Modal */}
      <Modal show={showTaskModal} onHide={() => { setShowTaskModal(false); setTaskForm({ title: '', description: '', assignedTo: '', priority: 'Medium', subtasks: [] }); setNewSubtaskTitle(''); }}>
        <Modal.Header closeButton>
          <Modal.Title>New Task</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTask}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Brief task title"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Add details about this task..."
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Assign to</Form.Label>
              <Form.Select
                value={taskForm.assignedTo}
                onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.isOnline ? '🟢' : '⚫'} {u.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Subtasks</Form.Label>
              {(taskForm.subtasks || []).map((st, i) => (
                <div key={i} className="d-flex align-items-center gap-1 mb-1">
                  <Form.Control
                    size="sm"
                    value={st.title}
                    onChange={(e) => {
                      const next = [...(taskForm.subtasks || [])];
                      next[i] = { ...next[i], title: e.target.value };
                      setTaskForm({ ...taskForm, subtasks: next });
                    }}
                    placeholder="Subtask title"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setTaskForm({
                      ...taskForm,
                      subtasks: (taskForm.subtasks || []).filter((_, idx) => idx !== i),
                    })}
                  >
                    ×
                  </button>
                </div>
              ))}
              <InputGroup size="sm">
                <Form.Control
                  placeholder="Add subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const title = newSubtaskTitle.trim();
                      if (title) {
                        setTaskForm({
                          ...taskForm,
                          subtasks: [...(taskForm.subtasks || []), { title, completed: false }],
                        });
                        setNewSubtaskTitle('');
                      }
                    }
                  }}
                />
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    const title = newSubtaskTitle.trim();
                    if (title) {
                      setTaskForm({
                        ...taskForm,
                        subtasks: [...(taskForm.subtasks || []), { title, completed: false }],
                      });
                      setNewSubtaskTitle('');
                    }
                  }}
                >
                  +
                </Button>
              </InputGroup>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateProject}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={projectForm.description || ''}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Due date & time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={projectForm.dueDate || ''}
                onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
              />
            </Form.Group>
            {project.archived && canEdit && (
              <Form.Group className="mb-3">
                <Form.Label>Finish rating (1–5)</Form.Label>
                <div className="d-flex gap-1 align-items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant={projectForm.finishRating === star ? 'warning' : 'outline-warning'}
                      size="sm"
                      className="p-1"
                      onClick={() => setProjectForm({ ...projectForm, finishRating: projectForm.finishRating === star ? null : star })}
                    >
                      ★
                    </Button>
                  ))}
                  {projectForm.finishRating && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-muted"
                      onClick={() => setProjectForm({ ...projectForm, finishRating: null })}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </Form.Group>
            )}
            {canManage && (
              <Form.Group className="mb-3">
                <Form.Label>Members (owner, editor, viewer)</Form.Label>
                <div className="small text-muted mb-2">
                  You are the owner. Add members with editor or viewer role.
                </div>
                {(projectForm.members || []).map((m, i) => (
                  <div key={i} className="d-flex align-items-center gap-2 mb-2">
                    <Form.Select
                      size="sm"
                      style={{ width: 'auto' }}
                      value={m.role || 'editor'}
                      onChange={(e) => {
                        const next = [...(projectForm.members || [])];
                        next[i] = { ...next[i], role: e.target.value };
                        setProjectForm({ ...projectForm, members: next });
                      }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </Form.Select>
                    <span className="flex-grow-1">
                      {m.user?.name ?? m.user ?? 'Unknown'}
                    </span>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => {
                        const next = (projectForm.members || []).filter((_, idx) => idx !== i);
                        setProjectForm({ ...projectForm, members: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <InputGroup size="sm">
                  <Form.Select
                    value={projectForm.newMemberUser || ''}
                    onChange={(e) => setProjectForm({ ...projectForm, newMemberUser: e.target.value })}
                  >
                    <option value="">Add member...</option>
                    {users
                      .filter((u) => {
                        const uid = u._id;
                        if (String(project.createdBy?._id ?? project.createdBy) === String(uid)) return false;
                        return !(projectForm.members || []).some((m) => String(m.user?._id ?? m.user) === String(uid));
                      })
                      .map((u) => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                  </Form.Select>
                  <Form.Select
                    value={projectForm.newMemberRole || 'editor'}
                    onChange={(e) => setProjectForm({ ...projectForm, newMemberRole: e.target.value })}
                    style={{ width: 'auto' }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </Form.Select>
                  <Button
                    variant="outline-primary"
                    onClick={() => {
                      const uid = projectForm.newMemberUser;
                      if (!uid) return;
                      const u = users.find((x) => x._id === uid);
                      setProjectForm({
                        ...projectForm,
                        members: [...(projectForm.members || []), { user: uid, role: projectForm.newMemberRole || 'editor' }],
                        newMemberUser: '',
                        newMemberRole: 'editor',
                      });
                    }}
                    disabled={!projectForm.newMemberUser}
                  >
                    Add
                  </Button>
                </InputGroup>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
