import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  uploadFile,
  type Todo,
  type CreateTodoInput,
  type FileUploadResult,
} from "./actions/todo.server";

interface FormData {
  text: string;
  description: string;
  priority: "low" | "medium" | "high";
  file: File | null;
}

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    text: "",
    description: "",
    priority: "medium",
    file: null,
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
  const isImage = (filepath: string): boolean => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return imageExtensions.some((ext) => filepath.toLowerCase().endsWith(ext));
  };

  const getFileName = (filepath: string): string => {
    return filepath.split("/").pop() || "";
  };

  // File to base64 converter
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Event handlers
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, file }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Handle file upload first if there's a file
      let attachments: string[] | undefined;
      if (formData.file) {
        const base64Content = await fileToBase64(formData.file);
        const uploadResult = await uploadFile({
          filename: formData.file.name,
          content: base64Content,
          mimetype: formData.file.type,
        });
        attachments = [uploadResult.path];
      }

      // Create the todo
      const todoData: CreateTodoInput = {
        text: formData.text,
        priority: formData.priority,
        description: formData.description || undefined,
        attachments,
      };

      const newTodo = await addTodo(todoData);
      setTodos([...todos, newTodo]);

      // Reset form
      setFormData({
        text: "",
        description: "",
        priority: "medium",
        file: null,
      });

      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add todo";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed });
      setTodos(todos.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (err) {
      setError("Failed to delete todo");
      console.error(err);
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loadingTodos) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <main>
      <h1>Todo List - React TypeScript Edition</h1>
      
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="todo-form"
        data-testid="todo-form"
      >
        <div className="form-group">
          <input
            className="todo-input"
            type="text"
            name="text"
            value={formData.text}
            onChange={handleInputChange}
            placeholder="What needs to be done?"
            data-testid="todo-input"
            required
          />
          <textarea
            className="todo-description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description (optional)"
            data-testid="todo-description"
            rows={2}
          />
          <div className="form-row">
            <select
              className="priority-select"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              data-testid="priority-select"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
            <label className="file-label">
              <input
                type="file"
                id="file-input"
                className="file-input"
                onChange={handleFileChange}
                data-testid="file-input"
                accept="image/*,text/*,.pdf,.doc,.docx"
              />
              <span className="file-label-text">
                {formData.file ? `📎 ${formData.file.name}` : "📎 Attach file"}
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
          {loading ? "Adding..." : "Add Todo"}
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="empty-state">No todos yet. Add one above!</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className="todo-item" data-testid="todo-item">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo)}
                data-testid="todo-checkbox"
                aria-label={`Mark ${todo.text} as ${todo.completed ? "incomplete" : "complete"}`}
              />

              <div className="todo-content">
                <div className="todo-header">
                  <span
                    className={todo.completed ? "completed" : ""}
                    data-testid="todo-text"
                  >
                    {todo.text}
                  </span>
                  <span
                    className={`priority priority-${todo.priority}`}
                    data-testid="todo-priority"
                  >
                    {todo.priority}
                  </span>
                </div>

                {todo.description && (
                  <p className="todo-description-text">{todo.description}</p>
                )}

                {todo.attachments && todo.attachments.length > 0 && (
                  <div className="attachments">
                    {todo.attachments.map((attachment, index) => (
                      <div key={index} className="file-preview">
                        {isImage(attachment) ? (
                          <a
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={attachment}
                              alt={`Attachment for ${todo.text}`}
                              className="preview-image"
                              data-testid="todo-file-preview"
                            />
                          </a>
                        ) : (
                          <a
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link"
                            data-testid="todo-file"
                          >
                            📎 {getFileName(attachment)}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <time className="todo-date" dateTime={todo.createdAt}>
                  {new Date(todo.createdAt).toLocaleDateString()}
                </time>
              </div>

              <button
                onClick={() => handleDelete(todo.id)}
                className="delete-button"
                data-testid="delete-button"
                aria-label={`Delete ${todo.text}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default App;