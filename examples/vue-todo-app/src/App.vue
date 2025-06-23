<template>
  <main>
    <h1>Todo List - Vue Edition</h1>


    <form @submit.prevent="handleSubmit" class="todo-form" data-testid="todo-form">
      <div class="form-group">
        <input
          class="todo-input"
          v-model="formData.text"
          type="text"
          placeholder="What needs to be done?"
          data-testid="todo-input"
        />
        <textarea
          class="todo-description"
          v-model="formData.description"
          placeholder="Add a description (optional)"
          data-testid="todo-description"
          rows="2"
        ></textarea>
        <div class="form-row">
          <select
            class="priority-select"
            v-model="formData.priority"
            data-testid="priority-select"
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
          <label class="file-label">
            <input
              type="file"
              class="file-input"
              @change="handleFileChange"
              data-testid="file-input"
              accept="image/*,text/*,.pdf,.doc,.docx"
            />
            <span class="file-label-text">
              {{ fileName ? `📎 ${fileName}` : "📎 Attach file" }}
            </span>
          </label>
        </div>
      </div>
      <button
        type="submit"
        class="todo-button"
        :disabled="loading || !formData.text"
        data-testid="add-button"
      >
        Add Todo
      </button>
    </form>

    <ul v-if="todos.length > 0" class="todo-list">
      <li
        v-for="todo in todos"
        :key="todo.id"
        class="todo-item"
        data-testid="todo-item"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          @change="handleToggle(todo)"
          data-testid="todo-checkbox"
        />

        <div class="todo-content">
          <div class="todo-header">
            <span
              :class="{ completed: todo.completed }"
              data-testid="todo-text"
            >
              {{ todo.text }}
            </span>
            <span
              v-if="todo.priority"
              class="priority"
              :class="`priority-${todo.priority}`"
              data-testid="todo-priority"
            >
              {{ todo.priority }}
            </span>
          </div>

          <p
            v-if="todo.description"
            class="todo-description-text"
          >
            {{ todo.description }}
          </p>

          <div v-if="todo.filepath" class="file-preview">
            <a
              v-if="isImage(todo.filepath)"
              :href="todo.filepath"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                :src="todo.filepath"
                :alt="todo.text"
                class="preview-image"
                data-testid="todo-file-preview"
              />
            </a>
            <a
              v-else
              :href="todo.filepath"
              target="_blank"
              rel="noopener noreferrer"
              class="file-link"
              data-testid="todo-file"
            >
              📎 View file
            </a>
          </div>
        </div>

        <button
          @click="handleDelete(todo.id)"
          class="delete-button"
          data-testid="delete-button"
        >
          Delete
        </button>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getTodos, addTodo, updateTodo, deleteTodo } from "./actions/todo.server.js";

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
    const todoData = {
      text: formData.value.text,
      priority: formData.value.priority,
    };
    
    // Only add optional fields if they have values
    if (formData.value.description) {
      todoData.description = formData.value.description;
    }
    if (formData.value.fileData) {
      todoData.fileData = formData.value.fileData;
      todoData.fileName = formData.value.fileName;
    }
    
    const newTodo = await addTodo(todoData);

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