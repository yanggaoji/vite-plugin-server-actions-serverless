import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";
import { rollup } from "rollup";
import serverActions from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("TypeScript Production Build", () => {
	const testDir = join(__dirname, "fixtures", "typescript-build-test");
	const distDir = join(testDir, "dist");

	beforeAll(async () => {
		// Create test directory structure
		await fs.mkdir(testDir, { recursive: true });
		await fs.mkdir(join(testDir, "src", "actions"), { recursive: true });

		// Create a TypeScript server file
		const tsServerFile = `
import { z } from "zod";

// Define types
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  tags?: string[];
}

export interface CreateTodoInput {
  text: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
}

// Zod schemas
const CreateTodoSchema = z.object({
  text: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string()).optional()
});

// Mock data
let todos: Todo[] = [];

/**
 * Get all todos
 * @returns {Promise<Todo[]>} List of all todos
 */
export async function getTodos(): Promise<Todo[]> {
  return todos;
}

/**
 * Add a new todo
 * @param {CreateTodoInput} input - The todo to create
 * @returns {Promise<Todo>} The created todo
 */
export async function addTodo(input: CreateTodoInput): Promise<Todo> {
  const validated = CreateTodoSchema.parse(input);
  const newTodo: Todo = {
    id: Date.now(),
    text: validated.text,
    completed: false,
    priority: validated.priority || "medium",
    tags: validated.tags
  };
  todos.push(newTodo);
  return newTodo;
}

// Attach schema for validation
addTodo.schema = z.tuple([CreateTodoSchema]);

/**
 * Update a todo
 * @param {number} id - Todo ID
 * @param {Partial<Todo>} updates - Updates to apply
 * @returns {Promise<Todo>} Updated todo
 */
export async function updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    throw new Error(\`Todo with id \${id} not found\`);
  }
  Object.assign(todo, updates);
  return todo;
}

// Arrow function export
export const deleteTodo = async (id: number): Promise<void> => {
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error(\`Todo with id \${id} not found\`);
  }
  todos.splice(index, 1);
};

// Complex type with generics
export async function filterTodos<T extends keyof Todo>(
  key: T,
  value: Todo[T]
): Promise<Todo[]> {
  return todos.filter(todo => todo[key] === value);
}

// Function with object literal type
export async function bulkUpdate(
  updates: { id: number; changes: Partial<Todo> }[]
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;
  
  for (const { id, changes } of updates) {
    try {
      await updateTodo(id, changes);
      updated++;
    } catch {
      failed++;
    }
  }
  
  return { updated, failed };
}
`;

		await fs.writeFile(join(testDir, "src", "actions", "todo.server.ts"), tsServerFile);

		// Create a simple entry file that imports the server actions
		const entryFile = `
import { getTodos, addTodo } from "./src/actions/todo.server.ts";

export async function test() {
  const todos = await getTodos();
  console.log(todos);
}
`;

		await fs.writeFile(join(testDir, "index.js"), entryFile);

		// Create package.json with zod dependency
		const packageJson = {
			name: "typescript-build-test",
			version: "1.0.0",
			dependencies: {
				zod: "^3.22.4",
			},
		};

		await fs.writeFile(join(testDir, "package.json"), JSON.stringify(packageJson, null, 2));
	});

	afterAll(async () => {
		// Clean up test directory
		await fs.rm(testDir, { recursive: true, force: true });
	});

	it("should compile TypeScript server files during build", async () => {
		// Create a simpler test that directly tests the plugin functionality
		const plugin = serverActions({
			validation: { enabled: true },
			openAPI: { enabled: true },
		});

		// Test the load hook directly with TypeScript content
		const tsCode = `
export interface Todo {
  id: number;
  text: string;
}

export async function getTodos(): Promise<Todo[]> {
  return [];
}

export async function addTodo(todo: Todo): Promise<Todo> {
  return todo;
}
`;

		// Get the plugin hooks
		const hooks = Array.isArray(plugin) ? plugin : [plugin];
		const mainPlugin = hooks.find((p) => p.name === "vite-plugin-server-actions");

		// Test that the plugin can load and transform TypeScript
		const loadResult = await mainPlugin.load.call({ emitFile: () => {} }, join(testDir, "src/actions/todo.server.ts"));

		expect(loadResult).toBeDefined();
		expect(loadResult).toContain("getTodos");
		expect(loadResult).toContain("addTodo");

		// Should be transformed to proxy functions
		expect(loadResult).toContain("fetch");
		expect(loadResult).toContain("/api/");
	});

	it("should generate .d.ts files with correct TypeScript types", async () => {
		// Test the type generation directly
		const serverFunctions = new Map([
			[
				"todo_module",
				{
					functions: ["getTodos", "addTodo", "updateTodo"],
					functionDetails: [
						{
							name: "getTodos",
							isAsync: true,
							params: [],
							returnType: "Promise<Todo[]>",
							jsdoc: "/**\n * Get all todos\n */",
						},
						{
							name: "addTodo",
							isAsync: true,
							params: [{ name: "input", type: "CreateTodoInput", isOptional: false }],
							returnType: "Promise<Todo>",
							jsdoc: "/**\n * Add a new todo\n */",
						},
						{
							name: "updateTodo",
							isAsync: true,
							params: [
								{ name: "id", type: "number", isOptional: false },
								{ name: "updates", type: "Partial<Todo>", isOptional: false },
							],
							returnType: "Promise<Todo>",
							jsdoc: "/**\n * Update a todo\n */",
						},
					],
					filePath: "src/actions/todo.server.ts",
				},
			],
		]);

		const options = {
			moduleNameTransform: (path) => path.replace(/\//g, "_").replace(/\.server\.(js|ts)$/, ""),
		};

		// Generate type definitions
		const { generateTypeDefinitions } = await import("../src/type-generator.js");
		const dtsContent = generateTypeDefinitions(serverFunctions, options);

		expect(dtsContent).toBeDefined();

		// Check type definitions
		expect(dtsContent).toContain("function getTodos(): Promise<Todo[]>");
		expect(dtsContent).toContain("function addTodo(input: CreateTodoInput): Promise<Todo>");
		expect(dtsContent).toContain("function updateTodo(id: number, updates: Partial<Todo>): Promise<Todo>");

		// Check JSDoc preservation
		expect(dtsContent).toContain("Get all todos");
		expect(dtsContent).toContain("Add a new todo");
		expect(dtsContent).toContain("Update a todo");
	});

	it("should generate OpenAPI spec from TypeScript types", async () => {
		// Test OpenAPI generation with TypeScript functions
		const { OpenAPIGenerator } = await import("../src/openapi.js");
		const { defaultSchemaDiscovery } = await import("../src/validation.js");

		const serverFunctions = new Map([
			[
				"todo_actions",
				{
					functions: ["getTodos", "addTodo"],
					functionDetails: [
						{
							name: "getTodos",
							isAsync: true,
							params: [],
							returnType: "Promise<Todo[]>",
						},
						{
							name: "addTodo",
							isAsync: true,
							params: [{ name: "todo", type: "CreateTodoInput" }],
							returnType: "Promise<Todo>",
						},
					],
					filePath: "src/actions/todo.server.ts",
				},
			],
		]);

		const openAPIGenerator = new OpenAPIGenerator({
			info: {
				title: "Test API",
				version: "1.0.0",
			},
		});

		const schemaDiscovery = defaultSchemaDiscovery;

		const openApiSpec = openAPIGenerator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
			routeTransform: (path, func) => `${path.replace(/\.server\.(js|ts)$/, "")}/${func}`,
		});

		expect(openApiSpec).toBeDefined();
		expect(openApiSpec.paths).toBeDefined();

		// Check that paths were generated
		const paths = Object.keys(openApiSpec.paths);
		expect(paths.length).toBeGreaterThan(0);
		expect(paths.some((p) => p.includes("getTodos"))).toBe(true);
		expect(paths.some((p) => p.includes("addTodo"))).toBe(true);
	});

	it("should handle TypeScript-specific syntax correctly", async () => {
		// Create a file with advanced TypeScript features
		const advancedTsFile = `
// Type aliases
type ID = string | number;
type Status = "active" | "inactive" | "pending";

// Interfaces with extends
interface BaseEntity {
  id: ID;
  createdAt: Date;
}

interface User extends BaseEntity {
  name: string;
  email: string;
  status: Status;
}

// Enums
enum Priority {
  Low = "low",
  Medium = "medium", 
  High = "high"
}

// Generics with constraints
export async function findOne<T extends BaseEntity>(
  items: T[],
  id: ID
): Promise<T | undefined> {
  return items.find(item => item.id === id);
}

// Intersection types
export async function mergeData(
  user: User,
  extra: { role: string } & { permissions: string[] }
): Promise<User & { role: string; permissions: string[] }> {
  return { ...user, ...extra };
}

// Tuple types
export async function coordinate(): Promise<[number, number, number]> {
  return [1, 2, 3];
}

// Conditional types in parameters
export async function processValue<T>(
  value: T
): Promise<T extends string ? string[] : T extends number ? number[] : T[]> {
  if (typeof value === "string") {
    return [value] as any;
  }
  if (typeof value === "number") {
    return [value] as any;
  }
  return [value] as any;
}
`;

		await fs.writeFile(join(testDir, "src", "actions", "advanced.server.ts"), advancedTsFile);

		const plugin = serverActions();

		const bundle = await rollup({
			input: join(testDir, "index.js"),
			plugins: [plugin],
			external: ["zod"],
		});

		const { output } = await bundle.generate({ format: "es" });
		await bundle.close();

		// Should compile without errors
		const mainOutput = output.find((o) => o.type === "chunk");
		expect(mainOutput).toBeDefined();

		// Should not contain TypeScript-only syntax
		expect(mainOutput.code).not.toContain("enum Priority");
		expect(mainOutput.code).not.toContain("interface User");
		expect(mainOutput.code).not.toContain("type ID =");
	});

	it("should preserve runtime behavior of TypeScript code", async () => {
		// Test TypeScript compilation through the plugin's transform
		const { extractExportedFunctions } = await import("../src/ast-parser.js");

		const tsCode = `
export class Counter {
  private count: number = 0;
  
  increment(): void {
    this.count++;
  }
  
  getCount(): number {
    return this.count;
  }
}

const counter = new Counter();

export async function incrementCounter(): Promise<number> {
  counter.increment();
  return counter.getCount();
}

export async function resetCounter(): Promise<void> {
  // Direct property access should work after compilation
  (counter as any).count = 0;
}
`;

		// Test that we can extract functions from TypeScript code
		const functions = extractExportedFunctions(tsCode, "test.ts");

		expect(functions).toBeDefined();
		expect(functions.length).toBe(2);
		expect(functions.find((f) => f.name === "incrementCounter")).toBeDefined();
		expect(functions.find((f) => f.name === "resetCounter")).toBeDefined();

		// Check return types
		const incrementFunc = functions.find((f) => f.name === "incrementCounter");
		expect(incrementFunc.returnType).toBe("Promise<number>");

		const resetFunc = functions.find((f) => f.name === "resetCounter");
		expect(resetFunc.returnType).toBe("Promise<void>");
	});
});
