import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import express from "express";
import serverActions from "../src/index.js";
import fs from "fs/promises";
import path from "path";

// Mock dependencies
vi.mock("fs/promises");
vi.mock("rollup", () => ({
	rollup: vi.fn(() => ({
		generate: vi.fn(() => ({
			output: [{ code: "mock bundled code" }],
		})),
	})),
}));

// Mock minimatch
vi.mock("minimatch", () => ({
	minimatch: vi.fn((filePath, pattern) => {
		if (pattern === "**/*.server.js") {
			return filePath.endsWith(".server.js");
		}
		return false;
	}),
}));

// Mock process.cwd
vi.spyOn(process, "cwd").mockReturnValue("/project");

// Mock express
const mockExpressApp = {
	use: vi.fn(),
	post: vi.fn(),
	get: vi.fn()
};

vi.mock("express", () => {
	const express = vi.fn(() => mockExpressApp);
	express.json = vi.fn(() => vi.fn());
	return { default: express };
});

describe("Integration Tests - Validation System", () => {
	let mockServer;
	let mockApp;

	beforeEach(() => {
		vi.clearAllMocks();
		
		mockApp = mockExpressApp;

		mockServer = {
			middlewares: {
				use: vi.fn(),
			},
		};
	});

	describe("Validation with Zod schemas", () => {
		it("should validate requests when validation is enabled with schemas", async () => {
			// Mock server file with validation schema
			const serverCode = `
				import { z } from 'zod';
				
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				// Attach schema to function
				createUser.schema = z.object({
					name: z.string().min(2),
					email: z.string().email(),
					age: z.number().min(18)
				});
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			// Mock dynamic import to return the module with schema
			const mockModule = {
				createUser: vi.fn().mockResolvedValue({ id: 1, name: "John", email: "john@example.com", age: 25 }),
			};
			mockModule.createUser.schema = z.object({
				name: z.string().min(2),
				email: z.string().email(),
				age: z.number().min(18)
			});

			// Mock the dynamic import
			const originalImport = await import("module");
			vi.doMock("/project/src/users.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true,
					adapter: "zod"
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/users.server.js");

			// Verify that endpoint was created with validation middleware
			expect(mockApp.post).toHaveBeenCalledWith(
				"/api/src_users/createUser",
				expect.any(Function), // validation middleware
				expect.any(Function)  // main handler
			);

			// Get the endpoint handler arguments
			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_users/createUser"
			);
			expect(postCall).toBeDefined();
			expect(postCall).toHaveLength(3); // path, validation middleware, handler
		});

		it("should reject invalid data in validation middleware", async () => {
			const serverCode = `
				import { z } from 'zod';
				
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				createUser.schema = z.object({
					name: z.string().min(2),
					email: z.string().email(),
					age: z.number().min(18)
				});
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				createUser: vi.fn(),
			};
			mockModule.createUser.schema = z.object({
				name: z.string().min(2),
				email: z.string().email(),
				age: z.number().min(18)
			});

			vi.doMock("/project/src/users.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/users.server.js");

			// Get the validation middleware
			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_users/createUser"
			);
			const validationMiddleware = postCall[1];

			// Test invalid request
			const mockReq = {
				url: "/api/src_users/createUser",
				body: [{ 
					name: "A", // Too short
					email: "invalid-email", // Invalid format
					age: 15 // Too young
				}]
			};

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn()
			};

			const mockNext = vi.fn();

			await validationMiddleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: "Validation failed",
				details: expect.arrayContaining([
					expect.objectContaining({
						path: "name",
						message: "String must contain at least 2 character(s)"
					}),
					expect.objectContaining({
						path: "email",
						message: "Invalid email"
					}),
					expect.objectContaining({
						path: "age",
						message: "Number must be greater than or equal to 18"
					})
				]),
				validationErrors: expect.arrayContaining([
					expect.objectContaining({
						path: "name",
						message: "String must contain at least 2 character(s)"
					}),
					expect.objectContaining({
						path: "email",
						message: "Invalid email"
					}),
					expect.objectContaining({
						path: "age",
						message: "Number must be greater than or equal to 18"
					})
				])
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it("should pass valid data through validation middleware", async () => {
			const serverCode = `
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				createUser.schema = z.object({
					name: z.string().min(2),
					email: z.string().email(),
					age: z.number().min(18)
				});
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				createUser: vi.fn(),
			};
			mockModule.createUser.schema = z.object({
				name: z.string().min(2),
				email: z.string().email(),
				age: z.number().min(18)
			});

			vi.doMock("/project/src/users.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/users.server.js");

			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_users/createUser"
			);
			const validationMiddleware = postCall[1];

			// Test valid request
			const validData = {
				name: "John Doe",
				email: "john@example.com",
				age: 25
			};

			const mockReq = {
				url: "/api/src_users/createUser",
				body: [validData]
			};

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn()
			};

			const mockNext = vi.fn();

			await validationMiddleware(mockReq, mockRes, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockRes.status).not.toHaveBeenCalled();
			expect(mockRes.json).not.toHaveBeenCalled();
			// Verify data is passed through unchanged
			expect(mockReq.body).toEqual([validData]);
		});
	});

	describe("OpenAPI generation integration", () => {
		it("should generate OpenAPI spec when enabled", async () => {
			const serverCode = `
				import { z } from 'zod';
				
				export async function getUsers() {
					return [];
				}
				
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				createUser.schema = z.object({
					name: z.string(),
					email: z.string().email()
				});
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				getUsers: vi.fn(),
				createUser: vi.fn(),
			};
			mockModule.createUser.schema = z.object({
				name: z.string(),
				email: z.string().email()
			});

			vi.doMock("/project/src/users.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true,
					generateOpenAPI: true,
					swaggerUI: true,
					openAPIOptions: {
						info: {
							title: "Test API",
							version: "1.0.0"
						},
						docsPath: "/api/docs",
						specPath: "/api/openapi.json"
					}
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/users.server.js");

			// Verify OpenAPI spec endpoint was created
			expect(mockApp.get).toHaveBeenCalledWith("/api/openapi.json", expect.any(Function));

			// Verify Swagger UI was set up (the implementation spreads the middleware array)
			expect(mockApp.use).toHaveBeenCalledWith("/api/docs", expect.any(Array), expect.any(Function));

			// Test the OpenAPI spec endpoint
			const getCall = mockApp.get.mock.calls.find(call => 
				call[0] === "/api/openapi.json"
			);
			const specHandler = getCall[1];

			const mockRes = {
				json: vi.fn()
			};

			specHandler({}, mockRes);

			expect(mockRes.json).toHaveBeenCalledWith(
				expect.objectContaining({
					openapi: "3.0.3",
					info: expect.objectContaining({
						title: "Test API",
						version: "1.0.0"
					}),
					paths: expect.objectContaining({
						"/api/src_users/getUsers": expect.any(Object),
						"/api/src_users/createUser": expect.any(Object)
					})
				})
			);
		});

		it("should include schema information in OpenAPI spec", async () => {
			const serverCode = `
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				createUser.schema = z.object({
					name: z.string().min(2),
					email: z.string().email(),
					age: z.number().min(18).max(100)
				});
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				createUser: vi.fn(),
			};
			mockModule.createUser.schema = z.object({
				name: z.string().min(2),
				email: z.string().email(),
				age: z.number().min(18).max(100)
			});

			vi.doMock("/project/src/test.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true,
					generateOpenAPI: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/test.server.js");

			const getCall = mockApp.get.mock.calls.find(call => 
				call[0] === "/api/openapi.json"
			);
			const specHandler = getCall[1];

			const mockRes = {
				json: vi.fn()
			};

			specHandler({}, mockRes);

			const spec = mockRes.json.mock.calls[0][0];
			const createUserPath = spec.paths["/api/src_test/createUser"];

			expect(createUserPath.post.requestBody.content["application/json"].schema).toEqual({
				type: "array",
				description: "Function arguments",
				items: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: undefined,
							minLength: 2
						},
						email: {
							type: "string",
							description: undefined,
							format: "email"
						},
						age: {
							type: "number",
							description: undefined,
							minimum: 18,
							maximum: 100
						}
					},
					required: ["name", "email", "age"],
					description: undefined
				}
			});
		});
	});

	describe("Middleware integration", () => {
		it("should combine custom middleware with validation middleware", async () => {
			const serverCode = `
				export async function testFunction() {
					return "test";
				}
				
				testFunction.schema = z.string();
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				testFunction: vi.fn().mockResolvedValue("test"),
			};
			mockModule.testFunction.schema = z.string();

			vi.doMock("/project/src/test.server.js", () => mockModule);

			const customMiddleware1 = vi.fn((req, res, next) => next());
			const customMiddleware2 = vi.fn((req, res, next) => next());

			const plugin = serverActions({
				middleware: [customMiddleware1, customMiddleware2],
				validation: {
					enabled: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/test.server.js");

			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_test/testFunction"
			);

			// Should have: custom middleware 1, custom middleware 2, validation middleware, handler
			expect(postCall).toHaveLength(5);
			expect(postCall[1]).toBe(customMiddleware1);
			expect(postCall[2]).toBe(customMiddleware2);
			expect(postCall[3]).toEqual(expect.any(Function)); // validation middleware
			expect(postCall[4]).toEqual(expect.any(Function)); // main handler
		});

		it("should work without validation when validation is disabled", async () => {
			const serverCode = `
				export async function testFunction() {
					return "test";
				}
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				testFunction: vi.fn().mockResolvedValue("test"),
			};

			vi.doMock("/project/src/test.server.js", () => mockModule);

			const customMiddleware = vi.fn((req, res, next) => next());

			const plugin = serverActions({
				middleware: customMiddleware,
				validation: {
					enabled: false
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/test.server.js");

			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_test/testFunction"
			);

			// Should have: custom middleware, handler (no validation middleware)
			expect(postCall).toHaveLength(3);
			expect(postCall[1]).toBe(customMiddleware);
			expect(postCall[2]).toEqual(expect.any(Function)); // main handler
		});
	});

	describe("Schema discovery integration", () => {
		it("should discover schemas from multiple modules", async () => {
			const userServerCode = `
				export async function createUser(userData) {
					return { id: 1, ...userData };
				}
				
				createUser.schema = z.object({ name: z.string() });
			`;

			const postServerCode = `
				export async function createPost(postData) {
					return { id: 1, ...postData };
				}
				
				createPost.schema = z.object({ title: z.string(), content: z.string() });
			`;

			vi.mocked(fs.readFile)
				.mockResolvedValueOnce(userServerCode)
				.mockResolvedValueOnce(postServerCode);

			const userModule = {
				createUser: vi.fn(),
			};
			userModule.createUser.schema = z.object({ name: z.string() });

			const postModule = {
				createPost: vi.fn(),
			};
			postModule.createPost.schema = z.object({ title: z.string(), content: z.string() });

			vi.doMock("/project/src/users.server.js", () => userModule);
			vi.doMock("/project/src/posts.server.js", () => postModule);

			const plugin = serverActions({
				validation: {
					enabled: true,
					generateOpenAPI: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/users.server.js");
			await plugin.load("/project/src/posts.server.js");

			// Verify both endpoints have validation
			expect(mockApp.post).toHaveBeenCalledWith(
				"/api/src_users/createUser",
				expect.any(Function), // validation middleware
				expect.any(Function)  // handler
			);

			expect(mockApp.post).toHaveBeenCalledWith(
				"/api/src_posts/createPost",
				expect.any(Function), // validation middleware
				expect.any(Function)  // handler
			);

			// Verify OpenAPI spec includes both
			const getCall = mockApp.get.mock.calls.find(call => 
				call[0] === "/api/openapi.json"
			);
			const specHandler = getCall[1];

			const mockRes = { json: vi.fn() };
			specHandler({}, mockRes);

			const spec = mockRes.json.mock.calls[0][0];
			expect(spec.paths["/api/src_users/createUser"]).toBeDefined();
			expect(spec.paths["/api/src_posts/createPost"]).toBeDefined();
		});
	});

	describe("Error handling integration", () => {
		it("should handle validation errors gracefully", async () => {
			const serverCode = `
				export async function testFunction() {
					throw new Error("Function error");
				}
				
				testFunction.schema = z.string();
			`;

			vi.mocked(fs.readFile).mockResolvedValue(serverCode);

			const mockModule = {
				testFunction: vi.fn().mockRejectedValue(new Error("Function error")),
			};
			mockModule.testFunction.schema = z.string();

			vi.doMock("/project/src/test.server.js", () => mockModule);

			const plugin = serverActions({
				validation: {
					enabled: true
				}
			});

			plugin.configureServer(mockServer);
			await plugin.load("/project/src/test.server.js");

			const postCall = mockApp.post.mock.calls.find(call => 
				call[0] === "/api/src_test/testFunction"
			);
			const handler = postCall[postCall.length - 1]; // Last function is the main handler

			const mockReq = {
				body: ["valid string"]
			};

			const mockRes = {
				json: vi.fn(),
				status: vi.fn().mockReturnThis()
			};

			await handler(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(500);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: "Internal server error",
				details: "Function error"
			});
		});
	});
});

describe("End-to-end validation workflow", () => {
	let mockServer, mockApp;

	beforeEach(() => {
		vi.clearAllMocks();
		
		mockApp = mockExpressApp;

		mockServer = {
			middlewares: {
				use: vi.fn(),
			},
		};
	});

	it("should handle complete validation workflow", async () => {
		// This test simulates a complete request lifecycle
		const serverCode = `
			import { z } from 'zod';
			
			export async function updateUserProfile(userId, profileData) {
				// Simulate database update
				return { 
					id: userId, 
					...profileData, 
					updatedAt: new Date().toISOString() 
				};
			}
			
			updateUserProfile.schema = z.tuple([
				z.string().uuid(),
				z.object({
					name: z.string().min(1),
					email: z.string().email(),
					bio: z.string().optional()
				})
			]);
		`;

		vi.mocked(fs.readFile).mockResolvedValue(serverCode);

		const mockModule = {
			updateUserProfile: vi.fn().mockImplementation((userId, profileData) => ({
				id: userId,
				...profileData,
				updatedAt: new Date().toISOString()
			})),
		};
		mockModule.updateUserProfile.schema = z.tuple([
			z.string().uuid(),
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				bio: z.string().optional()
			})
		]);

		vi.doMock("/project/src/profile.server.js", () => mockModule);

		const plugin = serverActions({
			validation: {
				enabled: true,
				generateOpenAPI: true
			}
		});

		plugin.configureServer(mockServer);
		await plugin.load("/project/src/profile.server.js");

		// Get the middleware chain
		const postCall = mockApp.post.mock.calls.find(call => 
			call[0] === "/api/src_profile/updateUserProfile"
		);
		const [path, validationMiddleware, handler] = postCall;

		// Test 1: Invalid request (validation should fail)
		const invalidReq = {
			url: "/api/src_profile/updateUserProfile",
			body: [
				"not-a-uuid",
				{
					name: "",
					email: "invalid-email"
				}
			]
		};

		const errorRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn()
		};

		const nextSpy = vi.fn();

		await validationMiddleware(invalidReq, errorRes, nextSpy);

		expect(errorRes.status).toHaveBeenCalledWith(400);
		expect(errorRes.json).toHaveBeenCalledWith({
			error: "Validation failed",
			details: expect.arrayContaining([
				expect.objectContaining({
					path: "0",
					message: expect.stringContaining("Invalid uuid")
				}),
				expect.objectContaining({
					path: "1.name",
					message: expect.stringContaining("at least 1")
				}),
				expect.objectContaining({
					path: "1.email",
					message: expect.stringContaining("Invalid email")
				})
			]),
			validationErrors: expect.any(Array)
		});
		expect(nextSpy).not.toHaveBeenCalled();

		// Test 2: Valid request (should pass validation and execute function)
		const validReq = {
			url: "/api/src_profile/updateUserProfile",
			body: [
				"123e4567-e89b-12d3-a456-426614174000",
				{
					name: "John Doe",
					email: "john@example.com",
					bio: "Software developer"
				}
			]
		};

		const successRes = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis()
		};

		const nextSuccess = vi.fn();

		// First pass through validation
		await validationMiddleware(validReq, successRes, nextSuccess);

		expect(nextSuccess).toHaveBeenCalled();
		expect(successRes.status).not.toHaveBeenCalled();

		// Then execute the handler
		await handler(validReq, successRes);

		expect(mockModule.updateUserProfile).toHaveBeenCalledWith(
			"123e4567-e89b-12d3-a456-426614174000",
			{
				name: "John Doe",
				email: "john@example.com",
				bio: "Software developer"
			}
		);

		expect(successRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "123e4567-e89b-12d3-a456-426614174000",
				name: "John Doe",
				email: "john@example.com",
				bio: "Software developer",
				updatedAt: expect.any(String)
			})
		);
	});
});