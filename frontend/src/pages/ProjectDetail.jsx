import { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toDateTimeLocal, formatDate, parseDate } from '../utils/dateUtils';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskArchive from '../components/TaskArchive';
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

  const fetchProject = async () => {
    try {
      const data = await api.get(`/projects/${id}`);
      setProject(data);
      setProjectForm({
        title: data?.title ?? '',
        description: data?.description ?? '',
        dueDate: toDateTimeLocal(data?.dueDate),
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
      await api.put(`/projects/${id}`, projectForm);
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
    return <Alert variant="danger">Project not found</Alert>;
  }

  const isCreator = project.createdBy && user && String(project.createdBy?._id ?? project.createdBy) === String(user.id);

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
        </div>
        <div>
          {isCreator && (
            <Button variant="outline-secondary" onClick={() => setShowEditModal(true)}>
              Edit Project
            </Button>
          )}
          <Button variant="primary" className="ms-2" onClick={() => setShowTaskModal(true)}>
            New Task
          </Button>
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

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <InputGroup>
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control
            type="search"
            placeholder="Search tasks by title, description, assignee..."
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
              isCreator={true}
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
                  <option key={u._id} value={u._id}>{u.name}</option>
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
