import type { Plugin } from "vite";
import type { Express } from "express";

export interface ServerActionOptions {
	/**
	 * Custom API prefix for server action endpoints
	 * @default "/api"
	 */
	apiPrefix?: string;
	
	/**
	 * Include patterns for server action files
	 * @default "**\/*.server.js"
	 */
	include?: string | string[];
	
	/**
	 * Exclude patterns for server action files
	 */
	exclude?: string | string[];
}

export interface ServerFunction {
	name: string;
	isAsync: boolean;
}

export interface ServerModule {
	functions: string[];
	id: string;
}

export interface ServerActionsPlugin extends Plugin {
	name: "vite-plugin-server-actions";
}

