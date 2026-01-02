/**
 * Base adapter interface for serverless platforms
 * 
 * This class provides a platform-agnostic interface that can be extended to support
 * any serverless platform. Built-in implementations include Express, AWS Lambda, and
 * Cloudflare Workers, but you can create adapters for:
 * 
 * - Azure Functions
 * - Google Cloud Functions
 * - Vercel Serverless Functions
 * - Netlify Functions
 * - Alibaba Cloud Function Compute
 * - Tencent Cloud SCF
 * - Any custom serverless platform
 * 
 * To create a custom adapter:
 * 1. Extend this class
 * 2. Implement normalizeRequest(platformRequest) to convert platform request to NormalizedRequest
 * 3. Implement createResponse() to create platform-compatible response wrapper
 * 4. Implement handleRequest(platformRequest) to handle the complete request lifecycle
 * 
 * See docs/custom-adapters.md for detailed guide and examples
 */

/**
 * Normalized request object
 * @typedef {Object} NormalizedRequest
 * @property {string} method - HTTP method
 * @property {string} url - Request URL
 * @property {Object} headers - Request headers
 * @property {any} body - Parsed request body
 * @property {Object} query - Query parameters
 */

/**
 * Normalized response object
 * @typedef {Object} NormalizedResponse
 * @property {function(number): NormalizedResponse} status - Set status code
 * @property {function(Object): void} json - Send JSON response
 * @property {function(): void} end - End response
 * @property {function(string, string): NormalizedResponse} header - Set response header
 */

/**
 * Base adapter class that all platform adapters extend
 * 
 * @example
 * ```javascript
 * import { BaseAdapter } from "vite-plugin-server-actions";
 * 
 * export class MyPlatformAdapter extends BaseAdapter {
 *   async normalizeRequest(platformRequest) {
 *     return {
 *       method: platformRequest.method,
 *       url: platformRequest.path,
 *       headers: platformRequest.headers,
 *       body: platformRequest.body,
 *       query: platformRequest.query,
 *     };
 *   }
 * 
 *   createResponse() {
 *     return {
 *       status(code) { ... },
 *       json(data) { ... },
 *       end() { ... },
 *       header(key, value) { ... },
 *     };
 *   }
 * 
 *   async handleRequest(platformRequest) {
 *     const req = await this.normalizeRequest(platformRequest);
 *     const res = this.createResponse();
 *     // ... handle request
 *     return res;
 *   }
 * }
 * ```
 */
export class BaseAdapter {
	constructor() {
		this.routes = new Map();
	}

	/**
	 * Register a route handler
	 * @param {string} method - HTTP method (GET, POST, etc.)
	 * @param {string} path - Route path
	 * @param {Function[]} handlers - Array of middleware/handler functions
	 */
	addRoute(method, path, ...handlers) {
		const key = `${method.toUpperCase()} ${path}`;
		this.routes.set(key, handlers);
	}

	/**
	 * Register a POST route
	 * @param {string} path - Route path
	 * @param {Function[]} handlers - Array of middleware/handler functions
	 */
	post(path, ...handlers) {
		this.addRoute("POST", path, ...handlers);
	}

	/**
	 * Register a GET route
	 * @param {string} path - Route path
	 * @param {Function[]} handlers - Array of middleware/handler functions
	 */
	get(path, ...handlers) {
		this.addRoute("GET", path, ...handlers);
	}

	/**
	 * Use middleware (applies to all routes)
	 * @param {Function} middleware - Middleware function
	 */
	use(middleware) {
		if (!this.globalMiddleware) {
			this.globalMiddleware = [];
		}
		this.globalMiddleware.push(middleware);
	}

	/**
	 * Normalize platform-specific request to common format
	 * Must be implemented by platform-specific adapters
	 * @param {any} platformRequest - Platform-specific request object
	 * @returns {Promise<NormalizedRequest>}
	 */
	async normalizeRequest(platformRequest) {
		throw new Error("normalizeRequest must be implemented by subclass");
	}

	/**
	 * Create platform-specific response wrapper
	 * Must be implemented by platform-specific adapters
	 * @returns {NormalizedResponse}
	 */
	createResponse() {
		throw new Error("createResponse must be implemented by subclass");
	}

	/**
	 * Execute middleware chain
	 * @param {NormalizedRequest} req - Normalized request
	 * @param {NormalizedResponse} res - Normalized response
	 * @param {Function[]} handlers - Array of handlers
	 */
	async executeHandlers(req, res, handlers) {
		let index = 0;

		const next = async (error) => {
			if (error) {
				// Error occurred, send error response
				res.status(500).json({
					error: true,
					status: 500,
					message: error.message || "Internal server error",
					code: "MIDDLEWARE_ERROR",
					timestamp: new Date().toISOString(),
				});
				return;
			}

			if (index >= handlers.length) {
				return;
			}

			const handler = handlers[index++];
			try {
				await handler(req, res, next);
			} catch (err) {
				next(err);
			}
		};

		await next();
	}

	/**
	 * Match route and return handlers
	 * @param {string} method - HTTP method
	 * @param {string} path - Request path
	 * @returns {Function[]|null}
	 */
	matchRoute(method, path) {
		const key = `${method.toUpperCase()} ${path}`;
		return this.routes.get(key) || null;
	}

	/**
	 * Handle incoming request
	 * Must be implemented by platform-specific adapters
	 * @param {any} platformRequest - Platform-specific request
	 * @returns {Promise<any>} Platform-specific response
	 */
	async handleRequest(platformRequest) {
		throw new Error("handleRequest must be implemented by subclass");
	}
}

/**
 * Create a JSON parser middleware
 */
export function createJsonParser() {
	return async (req, res, next) => {
		if (req.body === undefined && req.headers["content-type"]?.includes("application/json")) {
			try {
				// Body should already be parsed by platform adapter
				if (typeof req.body === "string") {
					req.body = JSON.parse(req.body);
				}
			} catch (error) {
				res.status(400).json({
					error: true,
					status: 400,
					message: "Invalid JSON in request body",
					code: "INVALID_JSON",
				});
				return;
			}
		}
		next();
	};
}
