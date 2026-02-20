import { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import KanbanBoard from '../components/KanbanBoard';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '' });
  const [projectForm, setProjectForm] = useState({});
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchProject = async () => {
    try {
      const data = await api.get(`/projects/${id}`);
      setProject(data);
      setProjectForm({ title: data.title, description: data.description });
    } catch (err) {
      setError(err.message || 'Failed to load project');
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
      await Promise.all([fetchProject(), fetchTasks()]);
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
      });
      setTaskForm({ title: '', description: '', assignedTo: '' });
      setShowTaskModal(false);
      fetchTasks();
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
    } catch (err) {
      setError(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/projects/${id}`, projectForm);
      setShowEditModal(false);
      fetchProject();
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
          <Button variant="outline-secondary" onClick={() => setShowEditModal(true)}>
            Edit Project
          </Button>
          <Button variant="primary" className="ms-2" onClick={() => setShowTaskModal(true)}>
            New Task
          </Button>
        </div>
      </div>

      {project.description && (
        <p className="text-muted mb-4">{project.description}</p>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <KanbanBoard
        tasks={tasks}
        isCreator={true}
        onStatusChange={(task, status) => handleUpdateTask(task._id, { status })}
        onAssigneeChange={(task, assignedTo) => handleUpdateTask(task._id, { assignedTo: assignedTo || null })}
        onDelete={handleDeleteTask}
        users={users}
      />

      {/* New Task Modal */}
      <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)}>
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
