import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const TODO_FILE = path.join(process.cwd(), "todos.json");

// Validation schemas
const TodoSchema = z.object({
	text: z.string().min(1, "Todo text is required").max(500, "Todo text must be less than 500 characters"),
	priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

const TodoUpdateSchema = z.object({
	text: z.string().min(1, "Todo text is required").max(500, "Todo text must be less than 500 characters").optional(),
	completed: z.boolean().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
});

const TodoIdSchema = z.number().int().positive("Todo ID must be a positive integer");

async function readTodos() {
	try {
		const data = await fs.readFile(TODO_FILE, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.log(error);
		if (error.code === "ENOENT") {
			// File doesn't exist, return an empty array
			return [];
		}
		console.error("Error reading todos:", error);
		throw error;
	}
}

async function writeTodos(todos) {
	try {
		await fs.writeFile(TODO_FILE, JSON.stringify(todos, null, 2), "utf8");
	} catch (error) {
		console.error("Error writing todos:", error);
		throw error;
	}
}

/**
 * Get all todos
 * @returns {Promise<Array>} List of all todos
 */
export async function getTodos() {
	return await readTodos();
}

/**
 * Add a new todo
 * @param {Object} todo - The todo to add
 * @param {string} todo.text - The todo text
 * @param {'low'|'medium'|'high'} [todo.priority='medium'] - Priority level
 * @returns {Promise<Object>} The created todo
 */
export async function addTodo(todo) {
	const todos = await readTodos();
	const newTodo = { 
		id: Date.now(), 
		text: todo.text, 
		completed: false, 
		priority: todo.priority || "medium",
		createdAt: new Date().toISOString()
	};
	todos.push(newTodo);
	await writeTodos(todos);
	return newTodo;
}

/**
 * Update an existing todo
 * @param {number} id - Todo ID
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.text] - New todo text
 * @param {boolean} [updates.completed] - Completion status
 * @param {'low'|'medium'|'high'} [updates.priority] - Priority level
 * @returns {Promise<Object>} The updated todo
 */
export async function updateTodo(id, updates) {
	const todos = await readTodos();
	const index = todos.findIndex((todo) => todo.id === id);
	if (index !== -1) {
		todos[index] = { ...todos[index], ...updates, updatedAt: new Date().toISOString() };
		await writeTodos(todos);
		return todos[index];
	}
	throw new Error("Todo not found");
}

/**
 * Delete a todo
 * @param {number} id - Todo ID to delete
 * @returns {Promise<void>}
 */
export async function deleteTodo(id) {
	const todos = await readTodos();
	const newTodos = todos.filter((todo) => todo.id != id);
	await writeTodos(newTodos);
}

// Attach schemas to functions for validation
addTodo.schema = TodoSchema;
updateTodo.schema = z.tuple([TodoIdSchema, TodoUpdateSchema]);
deleteTodo.schema = z.tuple([TodoIdSchema]);
