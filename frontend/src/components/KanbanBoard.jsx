import { Row, Col, Card, Badge, Form } from 'react-bootstrap';

const COLUMNS = [
  { key: 'To Do', label: 'To Do', variant: 'secondary' },
  { key: 'In Progress', label: 'In Progress', variant: 'primary' },
  { key: 'Done', label: 'Done', variant: 'success' },
];

export default function KanbanBoard({
  tasks,
  isCreator = false,
  onStatusChange,
  onAssigneeChange,
  onDelete,
  users = [],
}) {
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <Row>
      {COLUMNS.map((col) => (
        <Col key={col.key} md={4}>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Badge bg={col.variant}>{col.label}</Badge>
              <span className="text-muted small">{tasksByStatus[col.key]?.length || 0}</span>
            </Card.Header>
            <Card.Body
              className="min-vh-200"
              style={{ minHeight: 200 }}
              onDragOver={isCreator ? (e) => e.preventDefault() : undefined}
              onDrop={isCreator ? (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('taskId');
                const fromStatus = e.dataTransfer.getData('fromStatus');
                if (taskId && fromStatus !== col.key) {
                  const task = tasks.find((t) => t._id === taskId);
                  if (task) onStatusChange(task, col.key);
                }
              } : undefined}
            >
              {(tasksByStatus[col.key] || []).map((task) => (
                <Card
                  key={task._id}
                  className="mb-2 shadow-sm"
                  draggable={isCreator}
                  onDragStart={isCreator ? (e) => {
                    e.dataTransfer.setData('taskId', task._id);
                    e.dataTransfer.setData('fromStatus', task.status);
                  } : undefined}
                >
                  <Card.Body className="py-2">
                    <div className="d-flex justify-content-between">
                      <strong>{task.title}</strong>
                      {isCreator && (
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => onDelete(task)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {task.description && (
                      <p className="small text-muted mb-1 mt-1">{task.description}</p>
                    )}
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      {isCreator ? (
                        <>
                          <Form.Select
                            size="sm"
                            className="form-select-sm w-auto"
                            value={task.assignedTo?._id || ''}
                            onChange={(e) => onAssigneeChange(task, e.target.value || null)}
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Select
                            size="sm"
                            className="form-select-sm w-auto"
                            value={task.status}
                            onChange={(e) => onStatusChange(task, e.target.value)}
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                          </Form.Select>
                        </>
                      ) : (
                        <span>
                          {task.assignedTo?.name && <small className="text-muted me-2">→ {task.assignedTo.name}</small>}
                          <Badge bg="secondary">{task.status}</Badge>
                        </span>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
