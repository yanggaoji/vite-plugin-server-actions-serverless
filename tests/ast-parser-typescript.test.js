import { describe, it, expect } from "vitest";
import { extractExportedFunctions, extractTypeAnnotation } from "../src/ast-parser.js";

describe("AST Parser - TypeScript Support", () => {
  describe("Type Annotations", () => {
    it("should extract primitive type annotations", () => {
      const code = `
        export async function testFunc(
          name: string,
          age: number,
          active: boolean,
          data: any,
          unknown: unknown
        ): Promise<void> {
          // function body
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      expect(functions).toHaveLength(1);
      
      const func = functions[0];
      expect(func.params[0].type).toBe("string");
      expect(func.params[1].type).toBe("number");
      expect(func.params[2].type).toBe("boolean");
      expect(func.params[3].type).toBe("any");
      expect(func.params[4].type).toBe("unknown");
      expect(func.returnType).toBe("Promise<void>");
    });

    it("should extract array type annotations", () => {
      const code = `
        export async function processItems(
          items: string[],
          numbers: number[],
          nested: boolean[][]
        ): Promise<string[]> {
          return items;
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].type).toBe("string[]");
      expect(func.params[1].type).toBe("number[]");
      expect(func.params[2].type).toBe("boolean[][]");
      expect(func.returnType).toBe("Promise<string[]>");
    });

    it("should extract union type annotations", () => {
      const code = `
        export function processValue(
          value: string | number,
          status: "active" | "inactive" | "pending",
          nullable: string | null
        ): string | number {
          return value;
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].type).toBe("string | number");
      expect(func.params[1].type).toBe("\"active\" | \"inactive\" | \"pending\"");
      expect(func.params[2].type).toBe("string | null");
      expect(func.returnType).toBe("string | number");
    });

    it("should extract custom type references", () => {
      const code = `
        interface Todo {
          id: number;
          text: string;
        }
        
        export async function addTodo(todo: Todo): Promise<Todo> {
          return todo;
        }
        
        export async function getTodos(): Promise<Todo[]> {
          return [];
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      
      expect(functions[0].params[0].type).toBe("Todo");
      expect(functions[0].returnType).toBe("Promise<Todo>");
      expect(functions[1].returnType).toBe("Promise<Todo[]>");
    });

    it("should extract generic type references", () => {
      const code = `
        export async function processData<T>(
          data: T,
          items: Array<T>,
          promise: Promise<T>
        ): Promise<T> {
          return data;
        }
        
        export function transform(
          map: Map<string, number>,
          set: Set<string>
        ): void {}
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      
      expect(functions[0].params[0].type).toBe("T");
      expect(functions[0].params[1].type).toBe("Array<T>");
      expect(functions[0].params[2].type).toBe("Promise<T>");
      expect(functions[0].returnType).toBe("Promise<T>");
      
      expect(functions[1].params[0].type).toBe("Map<string, number>");
      expect(functions[1].params[1].type).toBe("Set<string>");
    });

    it("should extract object literal type annotations", () => {
      const code = `
        export async function uploadFile(
          file: { name: string; size: number; type: string },
          options?: { overwrite?: boolean; path?: string }
        ): Promise<{ id: string; url: string }> {
          return { id: "123", url: "http://example.com" };
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].type).toBe("{ name: string; size: number; type: string }");
      expect(func.params[1].type).toBe("{ overwrite?: boolean; path?: string }");
      expect(func.params[1].isOptional).toBe(true);
      expect(func.returnType).toBe("Promise<{ id: string; url: string }>");
    });

    it("should handle optional and rest parameters", () => {
      const code = `
        export function configure(
          required: string,
          optional?: number,
          ...rest: boolean[]
        ): void {}
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].name).toBe("required");
      expect(func.params[0].isOptional).toBe(false);
      
      expect(func.params[1].name).toBe("optional");
      expect(func.params[1].isOptional).toBe(true);
      
      expect(func.params[2].name).toBe("...rest");
      expect(func.params[2].isRest).toBe(true);
      expect(func.params[2].type).toBe("boolean[]");
    });

    it("should handle arrow functions with type annotations", () => {
      const code = `
        export const processItem = async (item: string): Promise<number> => {
          return item.length;
        };
        
        export const transform = (input: number): string => String(input);
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      
      expect(functions[0].name).toBe("processItem");
      expect(functions[0].params[0].type).toBe("string");
      expect(functions[0].returnType).toBe("Promise<number>");
      expect(functions[0].isAsync).toBe(true);
      
      expect(functions[1].name).toBe("transform");
      expect(functions[1].params[0].type).toBe("number");
      expect(functions[1].returnType).toBe("string");
      expect(functions[1].isAsync).toBe(false);
    });

    it("should handle complex nested types", () => {
      const code = `
        type Status = "active" | "inactive";
        interface User {
          id: number;
          name: string;
        }
        
        export async function complexFunc(
          users: User[],
          statusMap: Record<string, Status>,
          callback: (user: User) => void,
          nested: Array<Array<{ id: number; data: string[] }>>
        ): Promise<Record<string, User[]>> {
          return {};
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].type).toBe("User[]");
      expect(func.params[1].type).toBe("Record<string, Status>");
      expect(func.params[2].type).toContain("User");
      expect(func.params[3].type).toContain("Array<Array<");
      expect(func.returnType).toBe("Promise<Record<string, User[]>>");
    });

    it("should handle JSDoc comments with TypeScript", () => {
      const code = `
        /**
         * Process user data
         * @param user - The user object
         * @returns The processed user
         */
        export async function processUser(user: User): Promise<User> {
          return user;
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.jsdoc).toContain("Process user data");
      expect(func.jsdoc).toContain("@param user");
      expect(func.jsdoc).toContain("@returns");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid TypeScript syntax gracefully", () => {
      const code = `
        export function invalid(param: ): void {}
      `;
      
      // Should not throw, but return empty array due to parse error
      const functions = extractExportedFunctions(code, "test.ts");
      expect(functions).toEqual([]);
    });

    it("should handle missing type annotations", () => {
      const code = `
        export function noTypes(param1, param2) {
          return param1 + param2;
        }
      `;
      
      const functions = extractExportedFunctions(code, "test.ts");
      const func = functions[0];
      
      expect(func.params[0].type).toBeNull();
      expect(func.params[1].type).toBeNull();
      expect(func.returnType).toBeNull();
    });
  });
});