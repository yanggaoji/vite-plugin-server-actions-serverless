import React, { useState, useEffect } from "react";
import { getTodos, addTodo, updateTodo, deleteTodo } from "./actions/todo.server.js";

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
    <main>
      <h1>Todo List - React Edition</h1>


      <form onSubmit={handleSubmit} className="todo-form" data-testid="todo-form">
        <div className="form-group">
          <input
            className="todo-input"
            type="text"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="What needs to be done?"
            data-testid="todo-input"
          />
          <textarea
            className="todo-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a description (optional)"
            data-testid="todo-description"
            rows="2"
          />
          <div className="form-row">
            <select
              className="priority-select"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              data-testid="priority-select"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
            <label className="file-label">
              <input
                type="file"
                className="file-input"
                onChange={handleFileChange}
                data-testid="file-input"
                accept="image/*,text/*,.pdf,.doc,.docx"
              />
              <span className="file-label-text">
                {fileName ? `📎 ${fileName}` : "📎 Attach file"}
              </span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          className="todo-button"
          disabled={loading || !formData.text}
          data-testid="add-button"
        >
          Add Todo
        </button>
      </form>

      {todos.length > 0 && (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className="todo-item" data-testid="todo-item">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo)}
                data-testid="todo-checkbox"
              />

              <div className="todo-content">
                <div className="todo-header">
                  <span
                    className={todo.completed ? "completed" : ""}
                    data-testid="todo-text"
                  >
                    {todo.text}
                  </span>
                  {todo.priority && (
                    <span
                      className={`priority priority-${todo.priority}`}
                      data-testid="todo-priority"
                    >
                      {todo.priority}
                    </span>
                  )}
                </div>

                {todo.description && (
                  <p className="todo-description-text">{todo.description}</p>
                )}

                {todo.filepath && (
                  <div className="file-preview">
                    {isImage(todo.filepath) ? (
                      <a
                        href={todo.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={todo.filepath}
                          alt={todo.text}
                          className="preview-image"
                          data-testid="todo-file-preview"
                        />
                      </a>
                    ) : (
                      <a
                        href={todo.filepath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="file-link"
                        data-testid="todo-file"
                      >
                        📎 View file
                      </a>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(todo.id)}
                className="delete-button"
                data-testid="delete-button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;