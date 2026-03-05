import { Card, Form } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const SHORTCUTS = [
  { keys: 'Ctrl+N', desc: 'New task' },
  { keys: 'Ctrl+F', desc: 'Focus search' },
];

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <h1>Settings</h1>
      <Card className="mb-3" style={{ maxWidth: 500 }}>
        <Card.Header>
          <strong>Appearance</strong>
        </Card.Header>
        <Card.Body>
          <Form.Group className="d-flex align-items-center gap-2">
            <Form.Check
              type="switch"
              id="theme-switch"
              label="Dark mode"
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <span className="text-muted small">{theme === 'dark' ? 'On' : 'Off'}</span>
          </Form.Group>
        </Card.Body>
      </Card>
      <Card className="mb-3" style={{ maxWidth: 500 }}>
        <Card.Header>
          <strong>Keyboard shortcuts</strong>
        </Card.Header>
        <Card.Body>
          <p className="text-muted small mb-3">Available on the project board:</p>
          <div className="d-flex flex-column gap-2">
            {SHORTCUTS.map(({ keys, desc }) => (
              <div key={keys} className="d-flex justify-content-between align-items-center">
                <span>{desc}</span>
                <kbd className="bg-secondary">{keys}</kbd>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
