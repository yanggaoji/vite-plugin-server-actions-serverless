import { describe, it, expect } from "vitest";
import {
	createEnhancedError,
	enhanceFunctionNotFoundError,
	enhanceParsingError,
	enhanceValidationError,
	enhanceModuleLoadError,
	createDevelopmentWarning,
	generateHelpfulSuggestions,
} from "../src/error-enhancer.js";

describe("Error Enhancement", () => {
	describe("createEnhancedError", () => {
		it("should create basic enhanced error", () => {
			const error = createEnhancedError("Test Error", "Something went wrong");

			expect(error).toContain("[Vite Server Actions] Test Error");
			expect(error).toContain("Something went wrong");
		});

		it("should include file path when provided", () => {
			const error = createEnhancedError("Test Error", "Failed", {
				filePath: "/src/actions/todo.server.js",
			});

			expect(error).toContain("📁 File: /src/actions/todo.server.js");
		});

		it("should include function name when provided", () => {
			const error = createEnhancedError("Test Error", "Failed", {
				functionName: "getTodos",
			});

			expect(error).toContain("🔧 Function: getTodos");
		});

		it("should include available functions", () => {
			const error = createEnhancedError("Test Error", "Failed", {
				availableFunctions: ["getTodos", "addTodo", "deleteTodo"],
			});

			expect(error).toContain("📋 Available functions: getTodos, addTodo, deleteTodo");
		});

		it("should include suggestion when provided", () => {
			const error = createEnhancedError("Test Error", "Failed", {
				suggestion: "Did you mean 'getTodos'?",
			});

			expect(error).toContain("💡 Suggestion: Did you mean 'getTodos'?");
		});

		it("should include all context fields", () => {
			const error = createEnhancedError("Test Error", "Failed", {
				filePath: "/src/test.js",
				functionName: "myFunc",
				availableFunctions: ["funcA", "funcB"],
				suggestion: "Try this instead",
			});

			expect(error).toContain("📁 File:");
			expect(error).toContain("🔧 Function:");
			expect(error).toContain("📋 Available functions:");
			expect(error).toContain("💡 Suggestion:");
		});
	});

	describe("enhanceFunctionNotFoundError", () => {
		it("should suggest similar function names", () => {
			const error = enhanceFunctionNotFoundError("getTodso", "todos", ["getTodos", "addTodo", "deleteTodo"]);

			expect(error.suggestions[0]).toContain("getTodos");
		});

		it("should detect typos with 1 character difference", () => {
			const error = enhanceFunctionNotFoundError("geTodos", "todos", ["getTodos"]);

			expect(error.suggestions[0]).toContain("getTodos");
		});

		it("should detect typos with 2 character difference", () => {
			const error = enhanceFunctionNotFoundError("gettodos", "todos", ["getTodos"]);

			// Should suggest if distance <= 2
			expect(error.suggestions.length).toBeGreaterThan(0);
		});

		it("should not suggest when distance > 2", () => {
			const error = enhanceFunctionNotFoundError("xyz", "todos", ["getTodos"]);

			// Suggestions should not include similar functions with distance > 2
			expect(error.suggestions.every((s) => !s.includes("getTodos"))).toBe(true);
		});

		it("should include message with error context", () => {
			const error = enhanceFunctionNotFoundError("missing", "todos", ["getTodos"]);

			expect(error.message).toContain("Function Not Found");
			expect(error.message).toContain("missing");
			expect(error.message).toContain("todos");
		});

		it("should have error code", () => {
			const error = enhanceFunctionNotFoundError("notFound", "todos", ["getTodos"]);

			expect(error.code).toBe("FUNCTION_NOT_FOUND");
		});

		it("should handle empty function list", () => {
			const error = enhanceFunctionNotFoundError("notFound", "todos", []);

			expect(error.suggestions.length).toBeGreaterThan(0);
			expect(error.suggestions.some((s) => s.includes("export"))).toBe(true);
		});

		it("should suggest missing export when no functions", () => {
			const error = enhanceFunctionNotFoundError("getTodos", "todos", []);

			expect(error.suggestions.some((s) => s.toLowerCase().includes("export"))).toBe(true);
		});
	});

	describe("enhanceParsingError", () => {
		it("should enhance syntax errors", () => {
			const originalError = new Error("Unexpected token");
			const enhanced = enhanceParsingError("/src/broken.server.js", originalError);

			expect(enhanced.message).toContain("Parsing Error");
			expect(enhanced.message).toContain("broken.server.js");
		});

		it("should provide syntax error suggestions", () => {
			const originalError = new Error("Unexpected token }");
			const enhanced = enhanceParsingError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.length).toBeGreaterThan(0);
		});

		it("should have error code", () => {
			const originalError = new Error("Unexpected token");
			const enhanced = enhanceParsingError("/src/test.server.js", originalError);

			expect(enhanced.code).toBe("PARSE_ERROR");
		});

		it("should suggest checking syntax for unexpected token", () => {
			const originalError = new Error("Unexpected token {");
			const enhanced = enhanceParsingError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("syntax"))).toBe(true);
		});

		it("should suggest identifier rules", () => {
			const originalError = new Error("Unexpected Identifier");
			const enhanced = enhanceParsingError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("identifier"))).toBe(true);
		});

		it("should suggest for duplicate errors", () => {
			const originalError = new Error("duplicate identifier 'test'");
			const enhanced = enhanceParsingError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("duplicate"))).toBe(true);
		});
	});

	describe("enhanceValidationError", () => {
		it("should enhance Zod validation errors", () => {
			const validationErrors = [
				{
					path: "email",
					message: "Invalid email",
					code: "invalid_string",
				},
			];

			const enhanced = enhanceValidationError(validationErrors, "createUser");

			expect(enhanced.message).toContain("Validation Error");
			expect(enhanced.message).toContain("createUser");
		});

		it("should provide type mismatch suggestions", () => {
			const validationErrors = [
				{
					path: "age",
					message: "Expected number, received string",
					code: "invalid_type",
				},
			];

			const enhanced = enhanceValidationError(validationErrors, "updateUser");

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("type"))).toBe(true);
		});

		it("should provide required field suggestions", () => {
			const validationErrors = [
				{
					path: "name",
					message: "This field is missing",
					code: "invalid_type",
				},
			];

			const enhanced = enhanceValidationError(validationErrors, "createUser");

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("required"))).toBe(true);
		});

		it("should handle multiple validation errors", () => {
			const validationErrors = [
				{ path: "email", message: "Invalid email", code: "invalid_string" },
				{ path: "age", message: "Must be positive", code: "too_small" },
				{ path: "name", message: "Required", code: "invalid_type" },
			];

			const enhanced = enhanceValidationError(validationErrors, "createUser");

			expect(enhanced.suggestions.length).toBeGreaterThan(0);
		});

		it("should provide format error suggestions", () => {
			const validationErrors = [
				{
					path: "date",
					message: "Invalid datetime format",
					code: "invalid_string",
				},
			];

			const enhanced = enhanceValidationError(validationErrors, "scheduleEvent");

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("format"))).toBe(true);
		});

		it("should have error code", () => {
			const validationErrors = [{ path: "test", message: "Invalid", code: "invalid" }];
			const enhanced = enhanceValidationError(validationErrors, "testFunc");

			expect(enhanced.code).toBe("VALIDATION_ERROR");
		});
	});

	describe("enhanceModuleLoadError", () => {
		it("should enhance file not found errors", () => {
			const originalError = new Error("Cannot find module './missing.js'");
			originalError.code = "ENOENT";
			const enhanced = enhanceModuleLoadError("/src/actions/todo.server.js", originalError);

			expect(enhanced.message).toContain("Module Load Error");
			expect(enhanced.message).toContain("todo.server.js");
		});

		it("should suggest checking file existence for ENOENT", () => {
			const originalError = new Error("File not found");
			originalError.code = "ENOENT";
			const enhanced = enhanceModuleLoadError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("exist"))).toBe(true);
		});

		it("should suggest checking imports", () => {
			const originalError = new Error("Cannot import module");
			const enhanced = enhanceModuleLoadError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("import"))).toBe(true);
		});

		it("should suggest checking exports", () => {
			const originalError = new Error("Module has no exports");
			const enhanced = enhanceModuleLoadError("/src/test.server.js", originalError);

			expect(enhanced.suggestions.some((s) => s.toLowerCase().includes("export"))).toBe(true);
		});

		it("should have error code", () => {
			const originalError = new Error("Load failed");
			const enhanced = enhanceModuleLoadError("/src/test.server.js", originalError);

			expect(enhanced.code).toBe("MODULE_LOAD_ERROR");
		});
	});

	describe("createDevelopmentWarning", () => {
		it("should create warning with title and message", () => {
			const warning = createDevelopmentWarning("Missing Types", "Parameters lack type annotations");

			expect(warning).toContain("⚠️ Missing Types");
			expect(warning).toContain("Parameters lack type annotations");
		});

		it("should include file path when provided", () => {
			const warning = createDevelopmentWarning("Warning", "Issue found", {
				filePath: "/src/test.js",
			});

			expect(warning).toContain("📁 File: /src/test.js");
		});

		it("should include suggestion when provided", () => {
			const warning = createDevelopmentWarning("Warning", "Issue found", {
				suggestion: "Add type annotations",
			});

			expect(warning).toContain("💡 Tip: Add type annotations");
		});

		it("should format with emoji and structure", () => {
			const warning = createDevelopmentWarning("Test Warning", "Test message", {
				filePath: "/test.js",
				suggestion: "Fix this",
			});

			expect(warning).toMatch(/⚠️/);
			expect(warning).toMatch(/📁/);
			expect(warning).toMatch(/💡/);
		});
	});

	describe("generateHelpfulSuggestions", () => {
		it("should generate suggestions for no-functions-found", () => {
			const suggestions = generateHelpfulSuggestions("no-functions-found");

			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions.some((s) => s.toLowerCase().includes("export"))).toBe(true);
		});

		it("should generate suggestions for async-function-required", () => {
			const suggestions = generateHelpfulSuggestions("async-function-required");

			expect(suggestions.some((s) => s.toLowerCase().includes("async"))).toBe(true);
		});

		it("should generate suggestions for invalid-arguments", () => {
			const suggestions = generateHelpfulSuggestions("invalid-arguments");

			expect(suggestions.some((s) => s.toLowerCase().includes("json"))).toBe(true);
		});

		it("should generate suggestions for type-safety", () => {
			const suggestions = generateHelpfulSuggestions("type-safety");

			expect(suggestions.some((s) => s.toLowerCase().includes("typescript") || s.toLowerCase().includes("zod"))).toBe(
				true,
			);
		});
	});
});
