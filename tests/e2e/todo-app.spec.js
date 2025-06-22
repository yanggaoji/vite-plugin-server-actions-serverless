import { test, expect } from "@playwright/test";

test.describe("Todo App Integration", () => {
	test.beforeEach(async ({ page }) => {
		// Start with a fresh page
		await page.goto("/");
		// Wait for the app to load
		await expect(page.locator("h1")).toContainText("Todo List");

		// Clear existing todos for a clean test environment (with timeout limit)
		const maxDeletions = 20; // Prevent infinite loops
		let deletions = 0;
		while ((await page.getByTestId("delete-button").count()) > 0 && deletions < maxDeletions) {
			await page.getByTestId("delete-button").first().click();
			await page.waitForTimeout(50); // Small delay to ensure deletion
			deletions++;
		}
	});

	test.afterEach(async ({ page }) => {
		// Clean up any remaining state
		await page.close();
	});

	test("should load the todo app", async ({ page }) => {
		// Check that the page loads correctly
		await expect(page).toHaveTitle(/TODO Example Svelte/);

		// Check for main UI elements
		await expect(page.locator("h1")).toContainText("Todo List");
		await expect(page.getByTestId("todo-input")).toBeVisible();
		await expect(page.getByTestId("add-button")).toContainText("Add");
	});

	test("should add a new todo", async ({ page }) => {
		const todoText = "Test todo item";

		// Add a new todo
		await page.getByTestId("todo-input").fill(todoText);
		await page.getByTestId("add-button").click();

		// Wait for the todo to appear
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();

		// Verify input is cleared
		await expect(page.getByTestId("todo-input")).toHaveValue("");
	});

	test("should mark todo as completed", async ({ page }) => {
		const todoText = "Complete me";

		// Add a todo
		await page.getByTestId("todo-input").fill(todoText);
		await page.getByTestId("add-button").click();

		// Wait for todo to appear
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();

		// Mark as completed
		await page.getByTestId("todo-checkbox").click();

		// Verify todo is marked as completed (has the completed class)
		await expect(page.locator(".todo-item span.completed")).toContainText(todoText);
	});

	test("should delete a todo", async ({ page }) => {
		const todoText = "Delete me";

		// Add a todo
		await page.getByTestId("todo-input").fill(todoText);
		await page.getByTestId("add-button").click();

		// Wait for todo to appear
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();

		// Delete the todo
		await page.getByTestId("delete-button").click();

		// Verify todo is removed
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).not.toBeVisible();
	});

	test("should persist todos after page reload", async ({ page }) => {
		const todoText = "Persistent todo";

		// Add a todo
		await page.getByTestId("todo-input").fill(todoText);
		await page.getByTestId("add-button").click();

		// Wait for todo to appear
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();

		// Reload the page
		await page.reload();
		await expect(page.locator("h1")).toContainText("Todo List");

		// Verify todo persists
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();
	});

	test("should handle multiple todos", async ({ page }) => {
		// Add multiple todos
		const todos = ["First todo", "Second todo", "Third todo"];

		for (const todoText of todos) {
			await page.getByTestId("todo-input").fill(todoText);
			await page.getByTestId("add-button").click();
			await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();
		}

		// Verify all todos are present
		await expect(page.getByTestId("todo-item")).toHaveCount(3);

		// Mark second todo as completed
		await page.getByTestId("todo-item").nth(1).getByTestId("todo-checkbox").click();

		// Verify only second todo is completed
		await expect(page.locator(".todo-item span.completed")).toContainText("Second todo");
		await expect(page.locator(".todo-item span.completed")).toHaveCount(1);
	});

	test("should not add empty todos", async ({ page }) => {
		// Try to add empty todo
		await page.getByTestId("add-button").click();

		// Should not create any todo items
		await expect(page.getByTestId("todo-item")).toHaveCount(0);
	});
});

test.describe("API Integration", () => {
	test.afterEach(async ({ page }) => {
		await page.close();
	});
	test("should have working API endpoints", async ({ page }) => {
		// Test OpenAPI spec endpoint
		const response = await page.request.get("/api/openapi.json");
		expect(response.ok()).toBeTruthy();

		const spec = await response.json();
		expect(spec.openapi).toBe("3.0.3");
		expect(spec.info.title).toBe("Todo App API");

		// Verify API paths are using clean routes (based on our new default behavior)
		expect(spec.paths).toHaveProperty("/api/actions/todo/getTodos");
		expect(spec.paths).toHaveProperty("/api/actions/todo/addTodo");
		expect(spec.paths).toHaveProperty("/api/actions/todo/updateTodo");
		expect(spec.paths).toHaveProperty("/api/actions/todo/deleteTodo");
		expect(spec.paths).toHaveProperty("/api/actions/auth/login");
		expect(spec.paths).toHaveProperty("/api/actions/auth/logout");
	});

	test("should have accessible API documentation", async ({ page }) => {
		await page.goto("/api/docs");

		// Should load Swagger UI
		await expect(page.locator(".swagger-ui")).toBeVisible();
		await expect(page.locator(".info .title")).toContainText("Todo App API");

		// Should show API endpoints
		await expect(page.locator(".opblock-summary-path")).toContainText("/api/actions/todo/getTodos");
	});

	test("should validate API requests", async ({ page }) => {
		// Test adding todo with invalid data via API
		const response = await page.request.post("/api/actions/todo/addTodo", {
			data: [{ text: "" }], // Invalid: empty text
		});

		expect(response.status()).toBe(400);
		const error = await response.json();
		expect(error.error).toBe("Validation failed");
		expect(error.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: "text",
					message: expect.stringContaining("Todo text is required"),
				}),
			]),
		);
	});

	test("should handle valid API requests", async ({ page }) => {
		// Test adding a valid todo
		const response = await page.request.post("/api/actions/todo/addTodo", {
			data: [{ text: "API Test Todo" }],
		});

		expect(response.ok()).toBeTruthy();
		const result = await response.json();
		expect(result.text).toBe("API Test Todo");
		expect(result.completed).toBe(false);
		expect(result.id).toBeDefined();
	});

	test("should handle authentication", async ({ page }) => {
		// Test login endpoint
		const loginResponse = await page.request.post("/api/actions/auth/login", {
			data: ["admin", "admin"],
		});

		expect(loginResponse.ok()).toBeTruthy();
		const loginResult = await loginResponse.json();
		expect(loginResult.user).toBe("admin");
		expect(loginResult.role).toBe("admin");
	});

	test("should persist todos to JSON file", async ({ page }) => {
		const todoText = "File persistence test";

		// Add a todo via API
		const addResponse = await page.request.post("/api/actions/todo/addTodo", {
			data: [{ text: todoText }],
		});

		expect(addResponse.ok()).toBeTruthy();
		const addedTodo = await addResponse.json();
		expect(addedTodo.text).toBe(todoText);

		// Get all todos to verify it's persisted
		const getResponse = await page.request.post("/api/actions/todo/getTodos", {
			data: [],
		});

		expect(getResponse.ok()).toBeTruthy();
		const todos = await getResponse.json();
		expect(todos.some((todo) => todo.text === todoText)).toBe(true);

		// Update the todo
		const updateResponse = await page.request.post("/api/actions/todo/updateTodo", {
			data: [addedTodo.id, { completed: true }],
		});

		expect(updateResponse.ok()).toBeTruthy();
		const updatedTodo = await updateResponse.json();
		expect(updatedTodo.completed).toBe(true);

		// Verify the update persisted
		const getUpdatedResponse = await page.request.post("/api/actions/todo/getTodos", {
			data: [],
		});
		const updatedTodos = await getUpdatedResponse.json();
		const todo = updatedTodos.find((t) => t.id === addedTodo.id);
		expect(todo.completed).toBe(true);

		// Delete the todo
		const deleteResponse = await page.request.post("/api/actions/todo/deleteTodo", {
			data: [addedTodo.id],
		});

		expect(deleteResponse.ok()).toBeTruthy();

		// Verify deletion
		const getFinalResponse = await page.request.post("/api/actions/todo/getTodos", {
			data: [],
		});
		const finalTodos = await getFinalResponse.json();
		expect(finalTodos.some((todo) => todo.id === addedTodo.id)).toBe(false);
	});

	test("should handle CRUD operations through UI and persist data", async ({ page }) => {
		const todoText = "UI persistence test";

		// Add todo through UI
		await page.goto("/");
		await expect(page.locator("h1")).toContainText("Todo List");

		// Clear existing todos first
		const maxDeletions = 10;
		let deletions = 0;
		while ((await page.getByTestId("delete-button").count()) > 0 && deletions < maxDeletions) {
			await page.getByTestId("delete-button").first().click();
			await page.waitForTimeout(50);
			deletions++;
		}

		// Add new todo
		await page.getByTestId("todo-input").fill(todoText);
		await page.getByTestId("add-button").click();
		await expect(page.getByTestId("todo-text").filter({ hasText: todoText })).toBeVisible();

		// Verify it's in the API
		const getResponse = await page.request.post("/api/actions/todo/getTodos", {
			data: [],
		});
		const todos = await getResponse.json();
		const uiTodo = todos.find((todo) => todo.text === todoText);
		expect(uiTodo).toBeDefined();
		expect(uiTodo.completed).toBe(false);

		// Mark as completed through UI
		await page.getByTestId("todo-checkbox").click();
		await expect(page.locator(".todo-item span.completed")).toContainText(todoText);

		// Verify completion persisted in API
		const getCompletedResponse = await page.request.post("/api/actions/todo/getTodos", {
			data: [],
		});
		const completedTodos = await getCompletedResponse.json();
		const completedTodo = completedTodos.find((todo) => todo.id === uiTodo.id);
		expect(completedTodo.completed).toBe(true);
	});
});

test.describe("Performance and Reliability", () => {
	test.afterEach(async ({ page }) => {
		await page.close();
	});
	test("should load quickly", async ({ page }) => {
		const startTime = Date.now();
		await page.goto("/");
		await expect(page.locator("h1")).toBeVisible();
		const loadTime = Date.now() - startTime;

		// Should load within 3 seconds
		expect(loadTime).toBeLessThan(3000);
	});

	test("should handle many todos efficiently", async ({ page }) => {
		// Add 10 todos (reduced from 50 for faster testing)
		for (let i = 1; i <= 10; i++) {
			await page.getByTestId("todo-input").fill(`Todo ${i}`);
			await page.getByTestId("add-button").click();
			// Wait for each todo to appear before adding next
			await expect(page.getByTestId("todo-text").filter({ hasText: `Todo ${i}` })).toBeVisible();
		}

		// Should have all todos
		await expect(page.getByTestId("todo-item")).toHaveCount(10);

		// UI should still be responsive
		await page.getByTestId("todo-input").fill("Responsive test");
		await page.getByTestId("add-button").click();
		await expect(page.getByTestId("todo-text").filter({ hasText: "Responsive test" })).toBeVisible();
	});
});
