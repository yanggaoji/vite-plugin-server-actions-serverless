import util from "util";
import { createValidationMiddleware } from "./validation.js";

/**
 * Built-in logging middleware for server actions
 * Logs the action being triggered and the request body with syntax highlighting
 */
export function loggingMiddleware(req, res, next) {
	const timestamp = new Date().toISOString();
	const method = req.method;
	const url = req.url;

	// Extract action name from URL (format: /api/module_name/functionName)
	const urlParts = url.split("/");
	const functionName = urlParts[urlParts.length - 1];
	const moduleName = urlParts[urlParts.length - 2];

	// Log action trigger
	console.log(`\n[${timestamp}] 🚀 Server Action Triggered`);
	console.log(`├─ Module: ${moduleName}`);
	console.log(`├─ Function: ${functionName}`);
	console.log(`├─ Method: ${method}`);
	console.log(`└─ Endpoint: ${url}`);

	// Log request body with syntax highlighting
	if (req.body && Object.keys(req.body).length > 0) {
		console.log("\n📦 Request Body:");
		// Use util.inspect for colored output
		console.log(
			util.inspect(req.body, {
				colors: true,
				depth: null,
				compact: false,
			}),
		);
	} else {
		console.log("\n📦 Request Body: (empty)");
	}

	// Track response time
	const startTime = Date.now();

	// Override res.json to log response
	const originalJson = res.json.bind(res);
	res.json = function (data) {
		const duration = Date.now() - startTime;
		console.log(`\n✅ Response sent in ${duration}ms`);
		if (data) {
			console.log("📤 Response data:");
			console.log(
				util.inspect(data, {
					colors: true,
					depth: null,
					compact: false,
					maxArrayLength: 10, // Limit array output
				}),
			);
		}
		console.log("─".repeat(50));
		return originalJson(data);
	};

	// Handle errors
	const originalStatus = res.status.bind(res);
	res.status = function (statusCode) {
		if (statusCode >= 400) {
			const duration = Date.now() - startTime;
			console.log(`\n❌ Error response (${statusCode}) sent in ${duration}ms`);
		}
		return originalStatus(statusCode);
	};

	next();
}

/**
 * Create validation middleware with custom options
 * @param {object} options - Validation options
 * @returns {function} Validation middleware
 */
export function createValidationMiddlewareWithOptions(options = {}) {
	return createValidationMiddleware(options);
}

// Export a namespace for all built-in middleware
export const middleware = {
	logging: loggingMiddleware,
	validation: createValidationMiddleware,
};
