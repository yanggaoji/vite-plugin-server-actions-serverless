/**
 * Cloudflare Workers adapter for serverless deployment
 * Converts Fetch API Request to normalized request/response format
 */

import { BaseAdapter } from "./base.js";

export class WorkersAdapter extends BaseAdapter {
	constructor() {
		super();
	}

	/**
	 * Normalize Cloudflare Workers Request to standard format
	 * @param {Request} request - Fetch API Request object
	 * @returns {Promise<NormalizedRequest>}
	 */
	async normalizeRequest(request) {
		const url = new URL(request.url);
		const headers = {};

		// Convert Headers object to plain object
		request.headers.forEach((value, key) => {
			headers[key.toLowerCase()] = value;
		});

		// Parse body if present
		let body = null;
		if (request.method !== "GET" && request.method !== "HEAD") {
			const contentType = headers["content-type"] || "";
			if (contentType.includes("application/json")) {
				try {
					body = await request.json();
				} catch (e) {
					body = await request.text();
				}
			} else {
				body = await request.text();
			}
		}

		return {
			method: request.method,
			url: url.pathname + url.search,
			path: url.pathname,
			headers,
			body,
			query: Object.fromEntries(url.searchParams),
			rawRequest: request,
		};
	}

	/**
	 * Create response wrapper for Cloudflare Workers
	 * @returns {NormalizedResponse}
	 */
	createResponse() {
		const response = {
			status: 200,
			headers: new Headers({
				"Content-Type": "application/json",
			}),
			body: null,
		};

		const wrapper = {
			status(code) {
				response.status = code;
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
				response.headers.set(key, value);
				return wrapper;
			},
			_getResponse() {
				return new Response(response.body, {
					status: response.status,
					headers: response.headers,
				});
			},
			_finished: false,
		};

		return wrapper;
	}

	/**
	 * Handle Cloudflare Workers request
	 * @param {Request} request - Fetch API Request
	 * @returns {Promise<Response>} Fetch API Response
	 */
	async handleRequest(request) {
		const req = await this.normalizeRequest(request);
		const res = this.createResponse();

		// Apply global middleware first
		const handlers = [...(this.globalMiddleware || [])];

		// Match route handlers
		const routeHandlers = this.matchRoute(req.method, req.path);
		if (routeHandlers) {
			handlers.push(...routeHandlers);
		} else {
			// No route matched, return 404
			return new Response(
				JSON.stringify({
					error: true,
					status: 404,
					message: "Not found",
					code: "ROUTE_NOT_FOUND",
				}),
				{
					status: 404,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		// Execute handler chain
		await this.executeHandlers(req, res, handlers);

		// Return Fetch API Response
		return res._getResponse();
	}

	/**
	 * Create Workers fetch handler
	 * @returns {Object} Workers export object
	 */
	createHandler() {
		return {
			fetch: async (request, env, ctx) => {
				return await this.handleRequest(request);
			},
		};
	}
}

/**
 * Create Cloudflare Workers handler from adapter
 * @param {WorkersAdapter} adapter - Workers adapter instance
 * @returns {Object} Workers export object
 */
export function createWorkersHandler(adapter) {
	return adapter.createHandler();
}
