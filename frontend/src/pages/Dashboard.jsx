import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { canEditProject } from "../utils/projectRoles";
import { formatDate, parseDate } from "../utils/dateUtils";
import ProjectTrash from "../components/ProjectTrash";
import ProjectArchive from "../components/ProjectArchive";

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [trashedProjects, setTrashedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", members: [] });
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.get("/projects");
      setProjects(data);
    } catch (err) {
      setError(err.message || "Failed to load projects");
    }
  };

  const fetchArchivedProjects = async () => {
    try {
      const data = await api.get("/projects/archive");
      setArchivedProjects(data);
    } catch (err) {
      setArchivedProjects([]);
    }
  };

  const fetchTrashedProjects = async () => {
    try {
      const data = await api.get("/projects/trash");
      setTrashedProjects(data);
    } catch (err) {
      setTrashedProjects([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get("/users/list");
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchArchivedProjects(), fetchTrashedProjects(), fetchUsers()]);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      if (form.members?.length) {
        payload.members = form.members.map((m) => ({ user: m.user, role: m.role || "editor" }));
      }
      await api.post("/projects", payload);
      setForm({ title: "", description: "", dueDate: "", members: [] });
      setShowModal(false);
      fetchProjects();
      fetchArchivedProjects();
      fetchTrashedProjects();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Move this project to trash? You can restore it within 30 days.")) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
      fetchArchivedProjects();
      fetchTrashedProjects();
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  const handleRestoreProject = async (project) => {
    try {
      await api.post(`/projects/${project._id}/restore`);
      fetchProjects();
      fetchArchivedProjects();
      fetchTrashedProjects();
    } catch (err) {
      setError(err.message || "Failed to restore project");
    }
  };

  const handleArchiveProject = async (project) => {
    try {
      await api.put(`/projects/${project._id}`, { archived: true });
      fetchProjects();
      fetchArchivedProjects();
    } catch (err) {
      setError(err.message || "Failed to archive project");
    }
  };

  const handleRestoreFromArchive = async (project) => {
    try {
      await api.put(`/projects/${project._id}`, { archived: false });
      fetchProjects();
      fetchArchivedProjects();
    } catch (err) {
      setError(err.message || "Failed to restore project");
    }
  };

  const handlePermanentDelete = async (project) => {
    if (!confirm("Permanently delete this project and all its tasks? This cannot be undone.")) return;
    try {
      await api.delete(`/projects/${project._id}/permanent`);
      fetchTrashedProjects();
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Projects</h1>
        <Button variant="primary" onClick={() => setShowModal(true)} disabled={!user} title={!user ? "Log in to create a project" : ""}>
          New Project
        </Button>
        <Button
          variant={showArchive ? "secondary" : "outline-secondary"}
          onClick={() => { setShowArchive(!showArchive); setShowTrash(false); }}
        >
          {showArchive ? "Projects" : `Archive (${archivedProjects.length})`}
        </Button>
        <Button
          variant={showTrash ? "secondary" : "outline-secondary"}
          onClick={() => { setShowTrash(!showTrash); setShowArchive(false); }}
        >
          {showTrash ? "Projects" : `Trash (${trashedProjects.length})`}
        </Button>
      </div>

      {!user && (
        <Alert variant="info">
          <Alert.Link as={Link} to="/login">Log in</Alert.Link> to create projects and set due dates.
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {showTrash ? (
        <ProjectTrash
          projects={trashedProjects}
          onRestore={handleRestoreProject}
          onPermanentDelete={handlePermanentDelete}
          user={user}
        />
      ) : showArchive ? (
        <ProjectArchive
          projects={archivedProjects}
          onRestore={handleRestoreFromArchive}
          onDelete={(p) => handleDelete(p._id)}
          user={user}
        />
      ) : (
      <Row xs={1} md={2} lg={3} className="g-4">
        {projects.map((p) => (
          <Col key={p._id}>
            <Card>
              <Card.Body>
                <Card.Title>{p.title}</Card.Title>
                <Card.Text className="text-muted small">
                  {p.description || "No description"}
                </Card.Text>
                {parseDate(p.dueDate) && (
                  <Card.Text className="small">
                    Due: {formatDate(p.dueDate, { dateStyle: "short", timeStyle: "short" })}
                  </Card.Text>
                )}
                <div className="mt-3 d-flex gap-2">
                  <Button
                    as={Link}
                    to={`/project/${p._id}`}
                    variant="primary"
                    size="sm"
                  >
                    Open
                  </Button>
                  {user && canEditProject(p, user.id) && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleArchiveProject(p)}
                      title="Mark as done"
                    >
                      ✓ Done
                    </Button>
                  )}
                  {user && canEditProject(p, user.id) && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(p._id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      )}

      {projects.length === 0 && !loading && !showTrash && !showArchive && (
        <Card>
          <Card.Body className="text-center py-5 text-muted">
            No projects yet. Create your first project to get started.
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>New Project</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Due date & time</Form.Label>
              <Form.Control
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <Form.Text className="text-muted">When should this project be finished (optional)</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Add members (optional)</Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Select
                  value={form.newMemberUser || ""}
                  onChange={(e) => setForm({ ...form, newMemberUser: e.target.value })}
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </Form.Select>
                <Form.Select
                  value={form.newMemberRole || "editor"}
                  onChange={(e) => setForm({ ...form, newMemberRole: e.target.value })}
                  style={{ width: "auto" }}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Form.Select>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    const uid = form.newMemberUser;
                    if (!uid) return;
                    if ((form.members || []).some((m) => m.user === uid)) return;
                    setForm({
                      ...form,
                      members: [...(form.members || []), { user: uid, role: form.newMemberRole || "editor" }],
                      newMemberUser: "",
                      newMemberRole: "editor",
                    });
                  }}
                  disabled={!form.newMemberUser}
                >
                  Add
                </Button>
              </div>
              {(form.members || []).map((m, i) => (
                <div key={i} className="d-flex align-items-center gap-2 small mb-1">
                  <span>{users.find((u) => u._id === m.user)?.name ?? m.user}</span>
                  <Badge bg="secondary">{m.role}</Badge>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-danger"
                    onClick={() => setForm({ ...form, members: (form.members || []).filter((_, idx) => idx !== i) })}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
