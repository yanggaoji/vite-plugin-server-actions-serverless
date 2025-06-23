<template>
  <div class="container">
    <h1>Todo List - Vue Edition</h1>

    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="handleSubmit" class="todo-form">
      <div class="form-group">
        <label for="todo-text">Task</label>
        <input
          id="todo-text"
          v-model="formData.text"
          type="text"
          placeholder="What needs to be done?"
          data-testid="todo-input"
          required
        />
      </div>

      <div class="form-group">
        <label for="todo-description">Description (optional)</label>
        <textarea
          id="todo-description"
          v-model="formData.description"
          placeholder="Add more details..."
          data-testid="todo-description"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="priority">Priority</label>
        <select
          id="priority"
          v-model="formData.priority"
          data-testid="priority-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div class="form-group">
        <label for="file-input">Attachment (optional)</label>
        <div class="file-input-wrapper">
          <input
            id="file-input"
            type="file"
            @change="handleFileChange"
            data-testid="file-input"
          />
          <label for="file-input" class="file-label">
            <span class="file-label-text">
              {{ fileName || "Choose file" }}
            </span>
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading || !formData.text"
          data-testid="add-button"
        >
          {{ loading ? "Adding..." : "Add Todo" }}
        </button>
      </div>
    </form>

    <div v-if="loadingTodos" class="loading">Loading todos...</div>

    <div v-else-if="todos.length === 0" class="empty-state">
      <p>No todos yet. Create your first one!</p>
    </div>

    <div v-else class="todo-list">
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="todo-item"
        data-testid="todo-item"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          @change="handleToggle(todo)"
          class="todo-checkbox"
          data-testid="todo-checkbox"
        />

        <div class="todo-content">
          <div class="todo-header">
            <p
              class="todo-text"
              :class="{ completed: todo.completed }"
              data-testid="todo-text"
            >
              {{ todo.text }}
            </p>
            <span
              class="todo-priority"
              :class="`priority-${todo.priority}`"
              data-testid="todo-priority"
            >
              {{ todo.priority }}
            </span>
          </div>

          <p
            v-if="todo.description"
            class="todo-description"
          >
            <span class="todo-description-text">{{ todo.description }}</span>
          </p>

          <div v-if="todo.filepath" class="todo-file">
            <a
              v-if="isImage(todo.filepath)"
              :href="todo.filepath"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="todo.filepath"
                :alt="todo.text"
                class="todo-file-preview"
                data-testid="todo-file-preview"
              />
            </a>
            <a
              v-else
              :href="todo.filepath"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="todo-file"
            >
              📎 {{ getFileName(todo.filepath) }}
            </a>
          </div>
        </div>

        <div class="todo-actions">
          <button
            @click="handleDelete(todo.id)"
            class="btn-small btn-danger"
            data-testid="delete-button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getTodos, addTodo, updateTodo, deleteTodo } from "./actions/todo.server.js";
import { login } from "./actions/auth.server.js";

// State
const todos = ref([]);
const loading = ref(false);
const loadingTodos = ref(true);
const error = ref("");
const fileName = ref("");
const formData = ref({
  text: "",
  description: "",
  priority: "medium",
  fileData: null,
  fileName: null,
});

// Load todos on mount
onMounted(async () => {
  try {
    todos.value = await getTodos();
  } catch (err) {
    error.value = "Failed to load todos";
    console.error(err);
  } finally {
    loadingTodos.value = false;
  }
});

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
    fileName.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      formData.value.fileData = base64;
      formData.value.fileName = file.name;
    };
    reader.readAsDataURL(file);
  } else {
    fileName.value = "";
    formData.value.fileData = null;
    formData.value.fileName = null;
  }
};

const handleSubmit = async () => {
  if (!formData.value.text.trim()) return;

  loading.value = true;
  error.value = "";

  try {
    const newTodo = await addTodo({
      text: formData.value.text,
      description: formData.value.description,
      priority: formData.value.priority,
      fileData: formData.value.fileData,
      fileName: formData.value.fileName,
    });

    todos.value = [...todos.value, newTodo];

    // Reset form
    formData.value = {
      text: "",
      description: "",
      priority: "medium",
      fileData: null,
      fileName: null,
    };
    fileName.value = "";

    // Reset file input
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
  } catch (err) {
    error.value = "Failed to add todo";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleToggle = async (todo) => {
  try {
    const updated = await updateTodo(todo.id, { completed: !todo.completed });
    todos.value = todos.value.map((t) => (t.id === todo.id ? updated : t));
  } catch (err) {
    error.value = "Failed to update todo";
    console.error(err);
  }
};

const handleDelete = async (id) => {
  try {
    await deleteTodo(id);
    todos.value = todos.value.filter((t) => t.id !== id);
  } catch (err) {
    error.value = "Failed to delete todo";
    console.error(err);
  }
};
</script>