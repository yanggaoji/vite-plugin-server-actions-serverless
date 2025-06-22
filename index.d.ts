import type { Plugin } from "vite";

import type { RequestHandler } from "express";

export interface ServerActionOptions {
	/**
	 * Custom API prefix for server action endpoints
	 * @default "/api"
	 */
	apiPrefix?: string;
	
	/**
	 * Include patterns for server action files
	 * @default ["**\/*.server.js"]
	 */
	include?: string | string[];
	
	/**
	 * Exclude patterns for server action files
	 * @default []
	 */
	exclude?: string | string[];
	
	/**
	 * Middleware to run before server action handlers
	 * Can be a single middleware or array of middleware
	 */
	middleware?: RequestHandler | RequestHandler[];
}

export interface ServerActionsPlugin extends Plugin {
	name: "vite-plugin-server-actions";
}

/**
 * Creates a Vite plugin that enables server actions
 * @param options - Configuration options for the plugin
 * @returns Vite plugin instance
 */
declare function serverActions(options?: ServerActionOptions): ServerActionsPlugin;

/**
 * Built-in middleware for server actions
 */
export declare const middleware: {
	/**
	 * Logging middleware that displays server action calls with formatted JSON output
	 */
	logging: RequestHandler;
};

export default serverActions;