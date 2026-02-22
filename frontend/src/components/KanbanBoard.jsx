import { useState } from "react";
import { Row, Col, Card, Badge, Form, InputGroup } from "react-bootstrap";

const COLUMNS = [
  { key: "Todo", label: "Todo", variant: "secondary" },
  { key: "Active", label: "Active", variant: "primary" },
  { key: "Testing", label: "Testing", variant: "info" },
  { key: "Done", label: "Done", variant: "success" },
];

const PRIORITIES = [
  { key: "Low", label: "Low", variant: "secondary" },
  { key: "Medium", label: "Medium", variant: "info" },
  { key: "High", label: "High", variant: "warning" },
  { key: "Urgent", label: "Urgent", variant: "danger" },
];

export default function KanbanBoard({
  tasks,
  isCreator = false,
  onStatusChange,
  onPriorityChange,
  onSubtasksChange,
  onAssigneeChange,
  onDelete,
  users = [],
}) {
  const [newSubtask, setNewSubtask] = useState({});

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <Row>
      {COLUMNS.map((col) => (
        <Col key={col.key} md={6} lg={3}>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Badge bg={col.variant}>{col.label}</Badge>
              <span className="text-muted small">
                {tasksByStatus[col.key]?.length || 0}
              </span>
            </Card.Header>
            <Card.Body
              className="min-vh-200"
              style={{ minHeight: 200 }}
              onDragOver={isCreator ? (e) => e.preventDefault() : undefined}
              onDrop={
                isCreator
                  ? (e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData("taskId");
                      const fromStatus = e.dataTransfer.getData("fromStatus");
                      if (taskId && fromStatus !== col.key) {
                        const task = tasks.find((t) => t._id === taskId);
                        if (task) onStatusChange(task, col.key);
                      }
                    }
                  : undefined
              }
            >
              {(tasksByStatus[col.key] || []).map((task) => (
                <Card
                  key={task._id}
                  className="mb-2 shadow-sm"
                  draggable={isCreator}
                  onDragStart={
                    isCreator
                      ? (e) => {
                          e.dataTransfer.setData("taskId", task._id);
                          e.dataTransfer.setData("fromStatus", task.status);
                        }
                      : undefined
                  }
                >
                  <Card.Body className="py-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{task.title}</strong>
                        <Badge
                          bg={PRIORITIES.find((p) => p.key === (task.priority || "Medium"))?.variant || "secondary"}
                          className="ms-2"
                        >
                          {task.priority || "Medium"}
                        </Badge>
                      </div>
                      {isCreator && (
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => onDelete(task)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p className="small text-muted mb-1 mt-1">
                      {task.description || 'No description'}
                    </p>
                    {(task.subtasks?.length > 0 || isCreator) && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">
                          Subtasks
                          {task.subtasks?.length > 0 && (
                            <span className="ms-1">
                              ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                            </span>
                          )}
                        </small>
                        {(task.subtasks || []).map((st, i) => (
                          <div key={st._id || i} className="d-flex align-items-center gap-1 mb-1">
                            {isCreator ? (
                              <>
                                <Form.Check
                                  type="checkbox"
                                  checked={!!st.completed}
                                  onChange={() => {
                                    const updated = [...(task.subtasks || [])];
                                    updated[i] = { ...updated[i], completed: !updated[i].completed };
                                    onSubtasksChange?.(task, updated);
                                  }}
                                />
                                <span className={st.completed ? 'text-decoration-line-through text-muted' : ''} style={{ flex: 1 }}>
                                  {st.title}
                                </span>
                                <button
                                  className="btn btn-sm btn-link text-danger p-0"
                                  onClick={() => {
                                    const updated = (task.subtasks || []).filter((_, idx) => idx !== i);
                                    onSubtasksChange?.(task, updated);
                                  }}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <>
                                <Form.Check type="checkbox" checked={!!st.completed} disabled />
                                <span className={st.completed ? 'text-decoration-line-through text-muted' : ''}>
                                  {st.title}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                        {isCreator && (
                          <InputGroup size="sm" className="mt-1">
                            <Form.Control
                              placeholder="Add subtask..."
                              value={newSubtask[task._id] || ''}
                              onChange={(e) => setNewSubtask({ ...newSubtask, [task._id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const title = (newSubtask[task._id] || '').trim();
                                  if (title) {
                                    onSubtasksChange?.(task, [...(task.subtasks || []), { title, completed: false }]);
                                    setNewSubtask({ ...newSubtask, [task._id]: '' });
                                  }
                                }
                              }}
                            />
                            <InputGroup.Text
                              as="button"
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => {
                                const title = (newSubtask[task._id] || '').trim();
                                if (title) {
                                  onSubtasksChange?.(task, [...(task.subtasks || []), { title, completed: false }]);
                                  setNewSubtask({ ...newSubtask, [task._id]: '' });
                                }
                              }}
                            >
                              +
                            </InputGroup.Text>
                          </InputGroup>
                        )}
                      </div>
                    )}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 gap-1">
                      <div className="d-flex flex-wrap gap-1">
                        {isCreator ? (
                          <>
                            <Form.Select
                              size="sm"
                              className="form-select-sm w-auto"
                              value={task.priority || "Medium"}
                              onChange={(e) =>
                                onPriorityChange?.(task, e.target.value)
                              }
                            >
                              {PRIORITIES.map((p) => (
                                <option key={p.key} value={p.key}>
                                  {p.label}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Select
                              size="sm"
                              className="form-select-sm w-auto d-inline-block me-1"
                              value={task.assignedTo?._id || ""}
                              onChange={(e) =>
                                onAssigneeChange(task, e.target.value || null)
                              }
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
                              className="form-select-sm w-auto d-inline-block"
                              value={task.status}
                              onChange={(e) =>
                                onStatusChange(task, e.target.value)
                              }
                            >
                              {COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </Form.Select>
                          </>
                        ) : (
                          <span>
                            {task.assignedTo?.name && (
                              <small className="text-muted me-2">
                                → {task.assignedTo.name}
                              </small>
                            )}
                            <Badge bg={PRIORITIES.find((p) => p.key === (task.priority || "Medium"))?.variant || "secondary"} className="me-1">
                              {task.priority || "Medium"}
                            </Badge>
                            <Badge bg="secondary">{task.status}</Badge>
                          </span>
                        )}
                      </div>
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
