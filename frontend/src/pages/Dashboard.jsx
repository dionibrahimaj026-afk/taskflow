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
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.get("/projects");
      setProjects(data);
    } catch (err) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/projects", form);
      setForm({ title: "", description: "" });
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project and all its tasks?")) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
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
        <Button variant="primary" onClick={() => setShowModal(true)}>
          New Project
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {projects.map((p) => (
          <Col key={p._id}>
            <Card>
              <Card.Body>
                <Card.Title>{p.title}</Card.Title>
                <Card.Text className="text-muted small">
                  {p.description || "No description"}
                </Card.Text>
                <div className="mt-3 d-flex gap-2">
                  <Button
                    as={Link}
                    to={`/project/${p._id}`}
                    variant="primary"
                    size="sm"
                  >
                    Open
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(p._id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {projects.length === 0 && !loading && (
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
