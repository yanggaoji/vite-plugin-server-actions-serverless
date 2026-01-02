/**
 * AWS Lambda adapter for serverless deployment
 * Converts Lambda events to normalized request/response format
 */

import { BaseAdapter } from "./base.js";

export class LambdaAdapter extends BaseAdapter {
	constructor() {
		super();
		this.staticFiles = null;
	}

	/**
	 * Normalize Lambda event to standard request format
	 * @param {Object} event - Lambda event object
	 * @returns {Promise<NormalizedRequest>}
	 */
	async normalizeRequest(event) {
		const headers = {};
		
		// Handle both API Gateway v1 and v2 formats
		if (event.headers) {
			for (const [key, value] of Object.entries(event.headers)) {
				headers[key.toLowerCase()] = value;
			}
		}

		// Parse body if present
		let body = event.body;
		if (body && typeof body === "string") {
			try {
				if (headers["content-type"]?.includes("application/json")) {
					body = JSON.parse(body);
				}
			} catch (e) {
				// Keep as string if parsing fails
			}
		}

		// Support both API Gateway v1 and v2 path formats
		const path = event.rawPath || event.path || "/";
		const method = event.requestContext?.http?.method || event.httpMethod || "GET";

		return {
			method,
			url: path,
			path,
			headers,
			body,
			query: event.queryStringParameters || {},
			rawEvent: event,
		};
	}

	/**
	 * Create response wrapper for Lambda
	 * @returns {NormalizedResponse}
	 */
	createResponse() {
		const response = {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
			},
			body: null,
		};

		const wrapper = {
			status(code) {
				response.statusCode = code;
				return wrapper;
			},
			json(data) {
				response.body = JSON.stringify(data);
				wrapper._finished = true;
			},
			end() {
				if (!response.body) {
					response.body = "";
				}
				wrapper._finished = true;
			},
			header(key, value) {
				response.headers[key] = value;
				return wrapper;
			},
			_getResponse() {
				return response;
			},
			_finished: false,
		};

		return wrapper;
	}

	/**
	 * Handle Lambda event
	 * @param {Object} event - Lambda event
	 * @param {Object} context - Lambda context
	 * @returns {Promise<Object>} Lambda response
	 */
	async handleRequest(event, context) {
		const req = await this.normalizeRequest(event);
		const res = this.createResponse();

		// Apply global middleware first
		const handlers = [...(this.globalMiddleware || [])];

		// Match route handlers
		const routeHandlers = this.matchRoute(req.method, req.path);
		if (routeHandlers) {
			handlers.push(...routeHandlers);
		} else {
			// No route matched, return 404
			return {
				statusCode: 404,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					error: true,
					status: 404,
					message: "Not found",
					code: "ROUTE_NOT_FOUND",
				}),
			};
		}

		// Execute handler chain
		await this.executeHandlers(req, res, handlers);

		// Return Lambda response format
		return res._getResponse();
	}

	/**
	 * Create Lambda handler function
	 * @returns {Function} Lambda handler
	 */
	createHandler() {
		return async (event, context) => {
			return await this.handleRequest(event, context);
		};
	}
}

/**
 * Create Lambda handler from adapter
 * @param {LambdaAdapter} adapter - Lambda adapter instance
 * @returns {Function} Lambda handler function
 */
export function createLambdaHandler(adapter) {
	return adapter.createHandler();
}
