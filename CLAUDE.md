# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Vite Server Actions** - a Vite plugin that enables creating server-side functions and calling them from client-side code as seamless proxies. It's currently experimental and a proof of concept.

## Core Architecture

The plugin works by:

1. Scanning for files ending with `.server.js` during the build process
2. Extracting exported functions using regex parsing
3. In development: Creating Express middleware endpoints at `/api/{moduleName}/{functionName}`
4. In production: Bundling server functions and generating a standalone Express server
5. Client imports are transformed to proxy functions that make HTTP POST requests to the server endpoints

Key files:

- `src/index.js` - Main plugin implementation with Rollup integration
- `examples/todo-app/` - Working Svelte example demonstrating the plugin

## Development Commands

### Main project:

- `npm run format` - Format code with Prettier
- `npm run lint` - Check code quality with ESLint
- `npm run lint:fix` - Fix auto-fixable linting issues
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run typecheck` - Check TypeScript types
- `npm run check` - Run all quality checks (tests, lint, typecheck)
- `npm run sort` - Sort package.json
- `npm run example:dev` - Run the todo app example in development
- `npm run example:build` - Build the todo app example

### Todo app example:

- `cd examples/todo-app && npm run dev` - Development server
- `cd examples/todo-app && npm run build` - Production build
- `cd examples/todo-app && npm run preview` - Preview production build
- `cd examples/todo-app && npm run format` - Format example code

## Server Actions Pattern

Server functions must:

- Be in files ending with `.server.js`
- Export async functions
- Accept arguments that are JSON-serializable
- Return JSON-serializable values

The plugin transforms imports like:

```javascript
import { addTodo } from "./actions/todo.server.js";
```

Into client-side proxy functions that POST to `/api/todo/addTodo`.

## Production Build Output

The build process generates:

- `dist/actions.js` - Bundled server functions
- `dist/server.js` - Express server with API endpoints
- Client bundles with proxy functions replacing server imports
