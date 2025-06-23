import React, { useState, useEffect } from "react";
import { getTodos, addTodo, updateTodo, deleteTodo } from "./actions/todo.server.js";
import { login } from "./actions/auth.server.js";

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [formData, setFormData] = useState({
    text: "",
    description: "",
    priority: "medium",
    fileData: null,
    fileName: null,
  });

  // Load todos on mount
  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const todoList = await getTodos();
      setTodos(todoList);
    } catch (err) {
      setError("Failed to load todos");
      console.error(err);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Helper functions
  const isImage = (filepath) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return imageExtensions.some((ext) => filepath.toLowerCase().endsWith(ext));
  };

  const getFileName = (filepath) => {
    return filepath.split("/").pop();
  };

  // Event handlers
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(",")[1];
        setFormData((prev) => ({
          ...prev,
          fileData: base64,
          fileName: file.name,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFileName("");
      setFormData((prev) => ({
        ...prev,
        fileData: null,
        fileName: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    setLoading(true);
    setError("");

    try {
      const todoData = {
        text: formData.text,
        priority: formData.priority,
      };
      
      // Only add optional fields if they have values
      if (formData.description) {
        todoData.description = formData.description;
      }
      if (formData.fileData) {
        todoData.fileData = formData.fileData;
        todoData.fileName = formData.fileName;
      }
      
      const newTodo = await addTodo(todoData);

      setTodos([...todos, newTodo]);

      // Reset form
      setFormData({
        text: "",
        description: "",
        priority: "medium",
        fileData: null,
        fileName: null,
      });
      setFileName("");

      // Reset file input
      const fileInput = document.getElementById("file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError("Failed to add todo");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos(todos.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (err) {
      setError("Failed to delete todo");
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>Todo List - React Edition</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="todo-form">
        <div className="form-group">
          <label htmlFor="todo-text">Task</label>
          <input
            id="todo-text"
            type="text"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="What needs to be done?"
            data-testid="todo-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="todo-description">Description (optional)</label>
          <textarea
            id="todo-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add more details..."
            data-testid="todo-description"
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            data-testid="priority-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="file-input">Attachment (optional)</label>
          <div className="file-input-wrapper">
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              data-testid="file-input"
            />
            <label htmlFor="file-input" className="file-label">
              <span className="file-label-text">
                {fileName || "Choose file"}
              </span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !formData.text}
            data-testid="add-button"
          >
            {loading ? "Adding..." : "Add Todo"}
          </button>
        </div>
      </form>

      {loadingTodos ? (
        <div className="loading">Loading todos...</div>
      ) : todos.length === 0 ? (
        <div className="empty-state">
          <p>No todos yet. Create your first one!</p>
        </div>
      ) : (
        <div className="todo-list">
          {todos.map((todo) => (
            <div key={todo.id} className="todo-item" data-testid="todo-item">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo)}
                className="todo-checkbox"
                data-testid="todo-checkbox"
              />

              <div className="todo-content">
                <div className="todo-header">
                  <p
                    className={`todo-text ${todo.completed ? "completed" : ""}`}
                    data-testid="todo-text"
                  >
                    {todo.text}
                  </p>
                  <span
                    className={`todo-priority priority-${todo.priority}`}
                    data-testid="todo-priority"
                  >
                    {todo.priority}
                  </span>
                </div>

                {todo.description && (
                  <p className="todo-description">
                    <span className="todo-description-text">{todo.description}</span>
                  </p>
                )}

                {todo.filepath && (
                  <div className="todo-file">
                    {isImage(todo.filepath) ? (
                      <a
                        href={todo.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={todo.filepath}
                          alt={todo.text}
                          className="todo-file-preview"
                          data-testid="todo-file-preview"
                        />
                      </a>
                    ) : (
                      <a
                        href={todo.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="todo-file"
                      >
                        📎 {getFileName(todo.filepath)}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="todo-actions">
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="btn-small btn-danger"
                  data-testid="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;