import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// Types
export interface Todo {
  id: number;
  text: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
  attachments?: string[];
}

export interface CreateTodoInput {
  text: string;
  description?: string | null;
  priority?: "low" | "medium" | "high";
  attachments?: string[];
}

export interface UpdateTodoInput {
  text?: string;
  description?: string | null;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  attachments?: string[];
}

export interface FileUploadResult {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
}

// Path configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TODO_FILE = path.join(__dirname, "..", "..", "todos.json");
const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");

// Zod schemas for validation
const TodoSchema = z.object({
  id: z.number(),
  text: z.string().min(1),
  description: z.string().nullable(),
  completed: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.string(),
  attachments: z.array(z.string()).optional(),
});

const CreateTodoSchema = z.object({
  text: z.string().min(1, "Todo text is required"),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  attachments: z.array(z.string()).optional(),
});

const UpdateTodoSchema = z.object({
  text: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  attachments: z.array(z.string()).optional(),
});

const FileUploadSchema = z.object({
  filename: z.string(),
  content: z.string(), // base64 encoded
  mimetype: z.string(),
});

/**
 * Read todos from the JSON file
 * @returns {Promise<Todo[]>} Array of todos
 */
async function readTodos(): Promise<Todo[]> {
  try {
    const data = await fs.readFile(TODO_FILE, "utf8");
    const todos = JSON.parse(data);
    // Validate the data structure
    return z.array(TodoSchema).parse(todos);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist yet, return empty array
      await writeTodos([]);
      return [];
    }
    if (error instanceof SyntaxError) {
      // JSON is corrupted, reset to empty array
      console.error("Corrupted todos.json, resetting to empty array");
      await writeTodos([]);
      return [];
    }
    console.error("Error reading todos:", error);
    throw error;
  }
}

/**
 * Write todos to the JSON file
 * @param {Todo[]} todos - Array of todos to save
 * @returns {Promise<void>}
 */
async function writeTodos(todos: Todo[]): Promise<void> {
  try {
    await fs.writeFile(TODO_FILE, JSON.stringify(todos, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing todos:", error);
    throw error;
  }
}

/**
 * Get all todos
 * @returns {Promise<Todo[]>} List of all todos
 */
export async function getTodos(): Promise<Todo[]> {
  return await readTodos();
}

// No parameters, so no schema needed
getTodos.schema = z.tuple([]);

/**
 * Add a new todo
 * @param {CreateTodoInput} todo - The todo to add
 * @returns {Promise<Todo>} The created todo with generated ID and timestamp
 */
export async function addTodo(todo: CreateTodoInput): Promise<Todo> {
  // Validate input
  const validatedTodo = CreateTodoSchema.parse(todo);
  
  const todos = await readTodos();
  
  const newTodo: Todo = {
    id: Date.now(),
    text: validatedTodo.text,
    description: validatedTodo.description ?? null,
    completed: false,
    priority: validatedTodo.priority ?? "medium",
    createdAt: new Date().toISOString(),
    attachments: validatedTodo.attachments,
  };
  
  todos.push(newTodo);
  await writeTodos(todos);
  
  return newTodo;
}

// Attach schema for validation
addTodo.schema = z.tuple([CreateTodoSchema]);

/**
 * Update an existing todo
 * @param {number} id - The ID of the todo to update
 * @param {UpdateTodoInput} updates - The updates to apply
 * @returns {Promise<Todo>} The updated todo
 * @throws {Error} If todo not found
 */
export async function updateTodo(id: number, updates: UpdateTodoInput): Promise<Todo> {
  // Validate input
  const validatedUpdates = UpdateTodoSchema.parse(updates);
  
  const todos = await readTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  
  if (index === -1) {
    throw new Error(`Todo with id ${id} not found`);
  }
  
  todos[index] = {
    ...todos[index],
    ...validatedUpdates,
  };
  
  await writeTodos(todos);
  return todos[index];
}

// Attach schema for validation
updateTodo.schema = z.tuple([z.number(), UpdateTodoSchema]);

/**
 * Delete a todo
 * @param {number} id - The ID of the todo to delete
 * @returns {Promise<void>}
 * @throws {Error} If todo not found
 */
export async function deleteTodo(id: number): Promise<void> {
  const todos = await readTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  
  if (index === -1) {
    throw new Error(`Todo with id ${id} not found`);
  }
  
  // Delete associated files if any
  const todo = todos[index];
  if (todo.attachments && todo.attachments.length > 0) {
    for (const attachment of todo.attachments) {
      try {
        const filePath = path.join(UPLOAD_DIR, path.basename(attachment));
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete attachment ${attachment}:`, error);
      }
    }
  }
  
  todos.splice(index, 1);
  await writeTodos(todos);
}

// Attach schema for validation
deleteTodo.schema = z.tuple([z.number()]);

/**
 * Upload a file attachment
 * @param {Object} fileData - File data with filename, content (base64), and mimetype
 * @returns {Promise<FileUploadResult>} Upload result with file details
 */
export async function uploadFile(fileData: {
  filename: string;
  content: string;
  mimetype: string;
}): Promise<FileUploadResult> {
  // Validate input
  const validatedFile = FileUploadSchema.parse(fileData);
  
  // Ensure upload directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  
  // Generate unique filename
  const ext = path.extname(validatedFile.filename);
  const baseName = path.basename(validatedFile.filename, ext);
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const uniqueFilename = `${baseName}-${uniqueId}${ext}`;
  
  // Decode base64 content
  const buffer = Buffer.from(validatedFile.content, "base64");
  
  // Save file
  const filePath = path.join(UPLOAD_DIR, uniqueFilename);
  await fs.writeFile(filePath, buffer);
  
  const stats = await fs.stat(filePath);
  
  return {
    id: uniqueId,
    filename: uniqueFilename,
    path: `/uploads/${uniqueFilename}`,
    size: stats.size,
    mimetype: validatedFile.mimetype,
    uploadedAt: new Date().toISOString(),
  };
}

// Attach schema for validation
uploadFile.schema = z.tuple([FileUploadSchema]);