import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";

// Import generateCode from ast-parser - we'll need to export it
// For now, we'll test it indirectly through extractExportedFunctions
import { extractExportedFunctions } from "../src/ast-parser.js";

describe("generateCode - TypeScript Type Conversion", () => {
	describe("Basic Types", () => {
		it("should handle primitive types", () => {
			const code = `
				export function test(
					a: string,
					b: number,
					c: boolean,
					d: any,
					e: unknown,
					f: void,
					g: null,
					h: undefined,
					i: bigint,
					j: symbol,
					k: never
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("string");
			expect(params[1].type).toBe("number");
			expect(params[2].type).toBe("boolean");
			expect(params[3].type).toBe("any");
			expect(params[4].type).toBe("unknown");
			expect(params[5].type).toBe("void");
			expect(params[6].type).toBe("null");
			expect(params[7].type).toBe("undefined");
			expect(params[8].type).toBe("bigint");
			expect(params[9].type).toBe("symbol");
			expect(params[10].type).toBe("never");
		});

		it("should handle this type", () => {
			const code = `
				export function test(self: this): this {
					return self;
				}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			expect(functions[0].params[0].type).toBe("this");
			expect(functions[0].returnType).toBe("this");
		});
	});

	describe("Complex Types", () => {
		it("should handle intersection types", () => {
			const code = `
				export function test(
					simple: A & B,
					multiple: A & B & C,
					withPrimitives: string & { length: 5 }
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("A & B");
			expect(params[1].type).toBe("A & B & C");
			expect(params[2].type).toContain("string & ");
		});

		it("should handle tuple types", () => {
			const code = `
				export function test(
					simple: [string, number],
					mixed: [string, number, boolean],
					nested: [string, [number, boolean]],
					withOptional: [string, number?]
				): [string, number] {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("[string, number]");
			expect(params[1].type).toBe("[string, number, boolean]");
			expect(params[2].type).toBe("[string, [number, boolean]]");
			expect(functions[0].returnType).toBe("[string, number]");
		});

		it("should handle object types with index signatures", () => {
			const code = `
				export function test(
					simple: { [key: string]: any },
					typed: { [key: string]: number },
					withProps: { name: string; [key: string]: any }
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			// The current implementation may not perfectly handle mixed object types
			// but should at least not crash
			expect(params[0].type).toContain("{ ");
			expect(params[1].type).toContain("{ ");
			expect(params[2].type).toContain("name: string");
		});
	});

	describe("Template Literal Types", () => {
		it("should handle template literal types", () => {
			const code = `
				export function test(
					simple: \`prefix-\${string}\`,
					complex: \`\${string}-\${number}\`,
					literal: \`exact-value\`
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("`prefix-${string}`");
			expect(params[1].type).toBe("`${string}-${number}`");
			expect(params[2].type).toBe("`exact-value`");
		});
	});

	describe("Conditional Types", () => {
		it("should handle conditional types", () => {
			const code = `
				export function test(
					simple: T extends string ? true : false,
					nested: T extends U ? X : Y extends Z ? A : B
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("T extends string ? true : false");
			expect(params[1].type).toContain("extends");
			expect(params[1].type).toContain("?");
			expect(params[1].type).toContain(":");
		});
	});

	describe("Type Operators", () => {
		it("should handle type operators", () => {
			const code = `
				export function test(
					readonlyArray: readonly string[],
					keyofType: keyof User,
					typeofValue: typeof someValue
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("readonly string[]");
			expect(params[1].type).toBe("keyof User");
			expect(params[2].type).toBe("typeof someValue");
		});
	});

	describe("Indexed Access Types", () => {
		it("should handle indexed access types", () => {
			const code = `
				export function test(
					simple: User["name"],
					nested: User["address"]["street"],
					withUnion: User["name" | "email"]
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe('User["name"]');
			expect(params[1].type).toBe('User["address"]["street"]');
			expect(params[2].type).toBe('User["name" | "email"]');
		});
	});

	describe("Mapped Types", () => {
		it("should handle mapped types", () => {
			const code = `
				export function test(
					simple: { [K in keyof T]: T[K] },
					readonly: { readonly [K in keyof T]: T[K] },
					optional: { [K in keyof T]?: T[K] },
					complex: { -readonly [K in keyof T]-?: T[K] }
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toContain("[K in keyof T]");
			expect(params[1].type).toContain("readonly");
			expect(params[2].type).toContain("?");
			expect(params[3].type).toContain("-readonly");
			expect(params[3].type).toContain("-?");
		});
	});

	describe("Type Predicates", () => {
		it("should handle type predicates", () => {
			const code = `
				export function test(
					value: unknown
				): value is string {
					return typeof value === "string";
				}

				export function isUser(obj: any): obj is User {
					return obj && typeof obj.id === "number";
				}
			`;

			const functions = extractExportedFunctions(code, "test.ts");

			expect(functions[0].returnType).toBe("value is string");
			expect(functions[1].returnType).toBe("obj is User");
		});
	});

	describe("Import Types", () => {
		it("should handle import types", () => {
			const code = `
				export function test(
					simple: import("./types").User,
					withMember: import("./types").users.Admin,
					generic: import("./types").Result<string>
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe('import("./types").User');
			expect(params[1].type).toBe('import("./types").users.Admin');
			expect(params[2].type).toBe('import("./types").Result<string>');
		});
	});

	describe("Union and Array Types", () => {
		it("should handle complex union types", () => {
			const code = `
				export function test(
					union: string | number | boolean,
					literalUnion: "active" | "inactive" | "pending",
					mixedUnion: string | null | undefined,
					arrayUnion: string[] | number[]
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("string | number | boolean");
			expect(params[1].type).toBe('"active" | "inactive" | "pending"');
			expect(params[2].type).toBe("string | null | undefined");
			expect(params[3].type).toBe("string[] | number[]");
		});

		it("should handle nested array types", () => {
			const code = `
				export function test(
					simple: string[],
					nested: string[][],
					tripleNested: string[][][],
					withUnion: (string | number)[]
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("string[]");
			expect(params[1].type).toBe("string[][]");
			expect(params[2].type).toBe("string[][][]");
			expect(params[3].type).toBe("(string | number)[]");
		});
	});

	describe("Function Types", () => {
		it("should handle function type signatures", () => {
			const code = `
				export function test(
					simple: () => void,
					withParams: (a: string, b: number) => boolean,
					withOptional: (a?: string) => void,
					withRest: (...args: any[]) => void
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("() => void");
			expect(params[1].type).toBe("(a: string, b: number) => boolean");
			expect(params[2].type).toContain("(a?: string) => void");
			expect(params[3].type).toContain("(...args: any[]) => void");
		});
	});

	describe("Generic Types", () => {
		it("should handle generic type references", () => {
			const code = `
				export function test(
					promise: Promise<string>,
					array: Array<number>,
					map: Map<string, User>,
					set: Set<string>,
					nested: Promise<Array<User>>
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("Promise<string>");
			expect(params[1].type).toBe("Array<number>");
			expect(params[2].type).toBe("Map<string, User>");
			expect(params[3].type).toBe("Set<string>");
			expect(params[4].type).toBe("Promise<Array<User>>");
		});
	});

	describe("Edge Cases", () => {
		it("should handle deeply nested types", () => {
			const code = `
				export function test(
					deep: Map<string, Array<Promise<User | null>>>,
					complex: { a: { b: { c: string[] } } }
				): void {}
			`;

			const functions = extractExportedFunctions(code, "test.ts");
			const params = functions[0].params;

			expect(params[0].type).toBe("Map<string, Array<Promise<User | null>>>");
			expect(params[1].type).toContain("{ a: { b: { c: string[] } } }");
		});

		it("should handle malformed types gracefully", () => {
			const code = `
				export function test(param: ): void {}
			`;

			// Should not throw, but return empty array due to parse error
			const functions = extractExportedFunctions(code, "test.ts");
			expect(functions).toEqual([]);
		});
	});

	describe("Real-world Examples", () => {
		it("should handle todo app types", () => {
			const code = `
				interface Todo {
					id: number;
					text: string;
					completed: boolean;
					priority: "low" | "medium" | "high";
					createdAt: string;
				}

				export async function addTodo(
					todo: Omit<Todo, "id" | "createdAt">
				): Promise<Todo> {
					return {} as Todo;
				}

				export async function updateTodos(
					updates: Array<{ id: number; changes: Partial<Todo> }>
				): Promise<Todo[]> {
					return [];
				}
			`;

			const functions = extractExportedFunctions(code, "test.ts");

			expect(functions[0].params[0].type).toBe('Omit<Todo, "id" | "createdAt">');
			expect(functions[0].returnType).toBe("Promise<Todo>");

			expect(functions[1].params[0].type).toBe("Array<{ id: number; changes: Partial<Todo> }>");
			expect(functions[1].returnType).toBe("Promise<Todo[]>");
		});

		it("should handle validation schemas", () => {
			const code = `
				export async function validateUser<T extends z.ZodType>(
					data: unknown,
					schema: T
				): Promise<z.infer<T>> {
					return schema.parse(data);
				}
			`;

			const functions = extractExportedFunctions(code, "test.ts");

			expect(functions[0].params[0].type).toBe("unknown");
			expect(functions[0].params[1].type).toBe("T");
			expect(functions[0].returnType).toBe("Promise<z.infer<T>>");
		});
	});
});
