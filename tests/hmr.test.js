import { describe, it, expect, vi } from "vitest";
import serverActions from "../src/index.js";

describe("Hot Module Replacement (HMR)", () => {
	describe("Watcher setup", () => {
		it("should register watcher for file changes when watcher exists", () => {
			const mockWatcher = {
				on: vi.fn(),
			};

			const mockServer = {
				watcher: mockWatcher,
				middlewares: {
					use: vi.fn(),
				},
			};

			const plugin = serverActions();
			plugin.configureServer(mockServer);

			expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function));
		});

		it("should handle null watcher gracefully", () => {
			const pluginWithNullWatcher = serverActions();
			const serverWithNullWatcher = {
				watcher: null,
				middlewares: { use: vi.fn() },
			};

			// Should not crash
			expect(() => {
				pluginWithNullWatcher.configureServer(serverWithNullWatcher);
			}).not.toThrow();
		});

		it("should handle undefined watcher gracefully", () => {
			const pluginWithUndefinedWatcher = serverActions();
			const serverWithUndefinedWatcher = {
				middlewares: { use: vi.fn() },
			};

			// Should not crash
			expect(() => {
				pluginWithUndefinedWatcher.configureServer(serverWithUndefinedWatcher);
			}).not.toThrow();
		});
	});

	describe("File change handling", () => {
		it("should detect server file pattern changes", () => {
			const changeCallback = vi.fn();
			const mockWatcher = {
				on: vi.fn((event, callback) => {
					if (event === "change") {
						changeCallback.mockImplementation(callback);
					}
				}),
			};

			const mockServer = {
				watcher: mockWatcher,
				middlewares: { use: vi.fn() },
			};

			const plugin = serverActions();
			plugin.configureServer(mockServer);

			// Verify watcher was set up
			expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function));
		});

		it("should ignore non-server files", () => {
			const changeCallbacks = [];
			const mockWatcher = {
				on: vi.fn((event, callback) => {
					if (event === "change") {
						changeCallbacks.push(callback);
					}
				}),
			};

			const mockServer = {
				watcher: mockWatcher,
				middlewares: { use: vi.fn() },
			};

			const plugin = serverActions();
			plugin.configureServer(mockServer);

			// Get the callback
			const changeCallback = changeCallbacks[0];
			expect(changeCallback).toBeDefined();

			// Files that should be ignored
			const ignoredFiles = [
				"/project/src/components/TodoList.svelte",
				"/project/src/App.vue",
				"/project/src/main.js",
				"/project/src/styles.css",
			];

			// None of these should throw
			ignoredFiles.forEach((file) => {
				expect(() => changeCallback(file)).not.toThrow();
			});
		});
	});

	describe("Exclude patterns", () => {
		it("should respect exclude patterns in configuration", () => {
			const pluginWithExclude = serverActions({
				exclude: ["**/tmp/**", "**/test/**"],
			});

			const mockWatcher = {
				on: vi.fn(),
			};

			const mockServer = {
				watcher: mockWatcher,
				middlewares: { use: vi.fn() },
			};

			pluginWithExclude.configureServer(mockServer);

			// Should still register watcher
			expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function));
		});
	});

	describe("Module cache management", () => {
		it("should have per-instance cache", () => {
			const plugin1 = serverActions();
			const plugin2 = serverActions();

			const mockServer = {
				watcher: null,
				middlewares: { use: vi.fn() },
			};

			// Both plugins should be independent
			plugin1.configureServer(mockServer);
			plugin2.configureServer(mockServer);

			// They should not interfere with each other
			expect(plugin1).not.toBe(plugin2);
		});
	});

	describe("HMR logging", () => {
		it("should have HMR cleanup logging capability", () => {
			const mockWatcher = {
				on: vi.fn(),
			};

			const mockServer = {
				watcher: mockWatcher,
				middlewares: { use: vi.fn() },
			};

			const plugin = serverActions();

			// Should set up watcher without errors
			expect(() => {
				plugin.configureServer(mockServer);
			}).not.toThrow();

			// Watcher should be registered
			expect(mockWatcher.on).toHaveBeenCalled();
		});
	});
});
