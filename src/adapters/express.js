/**
 * Express adapter - wraps Express app to work with the base adapter interface
 * This maintains backward compatibility with existing Express-based deployments
 */

import express from "express";

export class ExpressAdapter {
	constructor() {
		this.app = express();
		this.app.use(express.json());
	}

	/**
	 * Get the underlying Express app
	 * @returns {express.Application}
	 */
	getApp() {
		return this.app;
	}

	/**
	 * Register a POST route
	 */
	post(path, ...handlers) {
		this.app.post(path, ...handlers);
	}

	/**
	 * Register a GET route
	 */
	get(path, ...handlers) {
		this.app.get(path, ...handlers);
	}

	/**
	 * Use middleware
	 */
	use(...args) {
		this.app.use(...args);
	}

	/**
	 * Start Express server
	 * @param {number} port - Port to listen on
	 * @returns {Promise<void>}
	 */
	listen(port) {
		return new Promise((resolve) => {
			this.app.listen(port, () => {
				console.log(`🚀 Server listening: http://localhost:${port}`);
				resolve();
			});
		});
	}
}
