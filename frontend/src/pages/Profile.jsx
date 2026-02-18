import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email || '', password: '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { name: form.name };
      if (form.email) payload.email = form.email;
      if (form.password) payload.password = form.password;
      const updated = await api.put(`/users/${user.id}`, payload);
      updateUser({ ...user, ...updated });
      setForm((f) => ({ ...f, password: '' }));
      setSuccess('Profile updated');
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <><h1>Profile</h1><Card><Card.Body>Please log in to edit your profile. <Link to="/login">Log in</Link></Card.Body></Card></>
    );
  }

  return (
    <>
      <h1>Profile</h1>
      <Card style={{ maxWidth: 500 }}>
        <Card.Body>
          {user?.avatar && (
            <div className="mb-3">
              <img
                src={user.avatar}
                alt=""
                width="64"
                height="64"
                className="rounded-circle"
              />
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password (leave blank to keep)</Form.Label>
              <Form.Control
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
              />
            </Form.Group>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
}
