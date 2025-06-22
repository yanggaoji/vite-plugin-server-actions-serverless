import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loggingMiddleware } from "./middleware.js";

describe("loggingMiddleware", () => {
	let mockReq, mockRes, mockNext;
	let consoleLogSpy;

	beforeEach(() => {
		mockReq = {
			method: "POST",
			url: "/api/test_module/testFunction",
			body: { arg1: "value1", arg2: 123 },
		};

		mockRes = {
			json: vi.fn(function (data) {
				return this;
			}),
			status: vi.fn(function () {
				return this;
			}),
		};

		mockNext = vi.fn();
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it("should log action trigger details", () => {
		loggingMiddleware(mockReq, mockRes, mockNext);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Server Action Triggered"));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Module: test_module"));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Function: testFunction"));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Method: POST"));
		expect(mockNext).toHaveBeenCalled();
	});

	it("should log request body", () => {
		loggingMiddleware(mockReq, mockRes, mockNext);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Request Body:"));
		// Check that the body was logged (util.inspect will format it)
		expect(consoleLogSpy).toHaveBeenCalled();
	});

	it("should handle empty request body", () => {
		mockReq.body = {};
		loggingMiddleware(mockReq, mockRes, mockNext);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Request Body: (empty)"));
	});

	it("should log response time and data", async () => {
		const originalJsonSpy = vi.spyOn(mockRes, "json");
		loggingMiddleware(mockReq, mockRes, mockNext);

		const responseData = { result: "success" };
		mockRes.json(responseData);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Response sent in"));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Response data:"));
		// The middleware wraps json, so check the original was called
		expect(originalJsonSpy).toHaveBeenCalled();
	});

	it("should log error responses", () => {
		loggingMiddleware(mockReq, mockRes, mockNext);

		mockRes.status(500);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Error response (500)"));
	});
});
