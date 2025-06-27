// vite.config.js
import { defineConfig } from "file:///Users/helge/code/vite-server-actions/examples/vue-todo-app/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/helge/code/vite-server-actions/examples/vue-todo-app/node_modules/@vitejs/plugin-vue/dist/index.mjs";

// ../../src/index.js
import fs2 from "fs/promises";
import path2 from "path";
import express from "file:///Users/helge/code/vite-server-actions/node_modules/express/index.js";
import { rollup } from "file:///Users/helge/code/vite-server-actions/node_modules/rollup/dist/es/rollup.js";
import { minimatch } from "file:///Users/helge/code/vite-server-actions/node_modules/minimatch/dist/esm/index.js";

// ../../src/validation.js
import { z } from "file:///Users/helge/code/vite-server-actions/node_modules/zod/dist/esm/index.js";

// ../../src/security.js
import path from "path";
function sanitizePath(filePath, basePath) {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    if (filePath.startsWith("/src/") || filePath.startsWith("/project/")) {
      const relativePath = filePath.startsWith("/project/") ? filePath.slice("/project/".length) : filePath.slice(1);
      const normalizedPath2 = path.resolve(basePath, relativePath);
      return normalizedPath2;
    }
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
  }
  const normalizedBase = path.resolve(basePath);
  const normalizedPath = path.resolve(basePath, filePath);
  if (!normalizedPath.startsWith(normalizedBase + path.sep) && normalizedPath !== normalizedBase) {
    console.error(`Path traversal attempt detected: ${filePath}`);
    return null;
  }
  const suspiciousPatterns = [
    /\0/,
    // Null bytes
    /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
    // Windows reserved names
  ];
  const pathSegments = filePath.split(/[/\\]/);
  for (const segment of pathSegments) {
    if (suspiciousPatterns.some((pattern) => pattern.test(segment))) {
      console.error(`Suspicious path segment detected: ${segment}`);
      return null;
    }
  }
  return normalizedPath;
}
function isValidModuleName(moduleName) {
  if (!moduleName || typeof moduleName !== "string") {
    return false;
  }
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(moduleName);
}
function createSecureModuleName(filePath) {
  return filePath.replace(/[^a-zA-Z0-9_/-]/g, "_").replace(/\/+/g, "_").replace(/-+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}
function createErrorResponse(status, message, code = null, details = null) {
  const error = {
    error: true,
    status,
    message,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (code) {
    error.code = code;
  }
  if (details) {
    error.details = details;
  }
  if (process.env.NODE_ENV === "production" && details?.stack) {
    delete details.stack;
  }
  return error;
}

// ../../src/validation.js
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "file:///Users/helge/code/vite-server-actions/node_modules/@asteasolutions/zod-to-openapi/dist/index.cjs";
extendZodWithOpenApi(z);
var ValidationAdapter = class {
  /**
   * Validate data against a schema
   * @param {any} schema - The validation schema
   * @param {any} data - The data to validate
   * @returns {Promise<{success: boolean, data?: any, errors?: any[]}>}
   */
  async validate(schema, data) {
    throw new Error("ValidationAdapter.validate must be implemented");
  }
  /**
   * Convert schema to OpenAPI schema format
   * @param {any} schema - The validation schema
   * @returns {object} OpenAPI schema object
   */
  toOpenAPISchema(schema) {
    throw new Error("ValidationAdapter.toOpenAPISchema must be implemented");
  }
  /**
   * Get parameter definitions for OpenAPI
   * @param {any} schema - The validation schema
   * @returns {Array} Array of OpenAPI parameter objects
   */
  getParameters(schema) {
    throw new Error("ValidationAdapter.getParameters must be implemented");
  }
};
var ZodAdapter = class extends ValidationAdapter {
  async validate(schema, data) {
    try {
      const validatedData = await schema.parseAsync(data);
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code,
            value: err.input
          }))
        };
      }
      return {
        success: false,
        errors: [
          {
            path: "root",
            message: error.message,
            code: "unknown"
          }
        ]
      };
    }
  }
  toOpenAPISchema(schema) {
    try {
      const registry = new OpenAPIRegistry();
      const schemaName = "_TempSchema";
      const extendedSchema = schema.openapi ? schema : schema;
      registry.register(schemaName, extendedSchema);
      const generator = new OpenApiGeneratorV3(registry.definitions);
      const components = generator.generateComponents();
      const openAPISchema = components.components?.schemas?.[schemaName];
      if (!openAPISchema) {
        return { type: "object", description: "Schema conversion not supported" };
      }
      return openAPISchema;
    } catch (error) {
      console.warn(`Failed to convert Zod schema to OpenAPI: ${error.message}`);
      return { type: "object", description: "Schema conversion failed" };
    }
  }
  getParameters(schema) {
    if (!schema || typeof schema._def === "undefined") {
      return [];
    }
    if (schema._def.typeName === "ZodArray") {
      const itemSchema = schema._def.type;
      return this._schemaToParameters(itemSchema, "body");
    } else if (schema._def.typeName === "ZodObject") {
      return this._objectToParameters(schema);
    }
    return [
      {
        name: "data",
        in: "body",
        required: true,
        schema: this.toOpenAPISchema(schema)
      }
    ];
  }
  _objectToParameters(zodObject) {
    const shape = zodObject._def.shape();
    const parameters = [];
    for (const [key, value] of Object.entries(shape)) {
      parameters.push({
        name: key,
        in: "body",
        required: !value.isOptional(),
        schema: this.toOpenAPISchema(value),
        description: value.description || `Parameter: ${key}`
      });
    }
    return parameters;
  }
  _schemaToParameters(schema, location = "body") {
    return [
      {
        name: "data",
        in: location,
        required: true,
        schema: this.toOpenAPISchema(schema)
      }
    ];
  }
};
var SchemaDiscovery = class {
  constructor(adapter = new ZodAdapter()) {
    this.adapter = adapter;
    this.schemas = /* @__PURE__ */ new Map();
  }
  /**
   * Register a schema for a function
   * @param {string} moduleName - Module name
   * @param {string} functionName - Function name
   * @param {any} schema - Validation schema
   */
  registerSchema(moduleName, functionName, schema) {
    const key = `${moduleName}.${functionName}`;
    this.schemas.set(key, schema);
  }
  /**
   * Get schema for a function
   * @param {string} moduleName - Module name
   * @param {string} functionName - Function name
   * @returns {any|null} Schema or null if not found
   */
  getSchema(moduleName, functionName) {
    const key = `${moduleName}.${functionName}`;
    return this.schemas.get(key) || null;
  }
  /**
   * Get all schemas
   * @returns {Map} All registered schemas
   */
  getAllSchemas() {
    return new Map(this.schemas);
  }
  /**
   * Discover schemas from module exports
   * @param {object} module - Module with exported functions
   * @param {string} moduleName - Module name
   */
  discoverFromModule(module, moduleName) {
    for (const [functionName, fn] of Object.entries(module)) {
      if (typeof fn === "function") {
        if (fn.schema) {
          this.registerSchema(moduleName, functionName, fn.schema);
        }
      }
    }
  }
  /**
   * Clear all schemas
   */
  clear() {
    this.schemas.clear();
  }
};
function createValidationMiddleware(options = {}) {
  const adapter = options.adapter || new ZodAdapter();
  const schemaDiscovery = options.schemaDiscovery || new SchemaDiscovery(adapter);
  return async function validationMiddleware(req, res, next) {
    let moduleName, functionName, schema;
    if (req.validationContext) {
      moduleName = req.validationContext.moduleName;
      functionName = req.validationContext.functionName;
      schema = req.validationContext.schema;
    } else {
      const urlParts = req.url.split("/");
      functionName = urlParts[urlParts.length - 1];
      moduleName = urlParts[urlParts.length - 2];
      schema = schemaDiscovery.getSchema(moduleName, functionName);
    }
    if (!schema) {
      return next();
    }
    try {
      if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.status(400).json(createErrorResponse(
          400,
          "Request body must be a non-empty array of function arguments",
          "INVALID_REQUEST_BODY"
        ));
      }
      let validationData;
      if (schema._def?.typeName === "ZodTuple") {
        validationData = req.body;
      } else {
        validationData = req.body[0];
      }
      const result = await adapter.validate(schema, validationData);
      if (!result.success) {
        return res.status(400).json(createErrorResponse(
          400,
          "Validation failed",
          "VALIDATION_ERROR",
          { validationErrors: result.errors }
        ));
      }
      if (schema._def?.typeName === "ZodTuple") {
        req.body = result.data;
      } else {
        req.body = [result.data];
      }
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(500).json(createErrorResponse(
        500,
        "Internal validation error",
        "VALIDATION_INTERNAL_ERROR",
        process.env.NODE_ENV !== "production" ? { message: error.message, stack: error.stack } : null
      ));
    }
  };
}
var defaultAdapter = new ZodAdapter();
var defaultSchemaDiscovery = new SchemaDiscovery(defaultAdapter);

// ../../src/openapi.js
import swaggerUi from "file:///Users/helge/code/vite-server-actions/node_modules/swagger-ui-express/index.js";
var OpenAPIGenerator = class {
  constructor(options = {}) {
    this.adapter = options.adapter || defaultAdapter;
    this.info = {
      title: "Server Actions API",
      version: "1.0.0",
      description: "Auto-generated API documentation for Vite Server Actions",
      ...options.info
    };
    this.servers = options.servers || [
      {
        url: "http://localhost:5173",
        description: "Development server"
      }
    ];
  }
  /**
   * Generate complete OpenAPI specification
   * @param {Map} serverFunctions - Map of server functions
   * @param {SchemaDiscovery} schemaDiscovery - Schema discovery instance
   * @param {object} options - Generation options
   * @returns {object} Complete OpenAPI 3.0 specification
   */
  generateSpec(serverFunctions, schemaDiscovery, options = {}) {
    const spec = {
      openapi: "3.0.3",
      info: this.info,
      servers: this.servers,
      paths: {},
      components: {
        schemas: {}
      }
    };
    for (const [moduleName, { functions, filePath }] of serverFunctions) {
      for (const functionName of functions) {
        let routePath;
        if (options.routeTransform && filePath) {
          routePath = options.routeTransform(filePath, functionName);
        } else {
          routePath = `${moduleName}/${functionName}`;
        }
        const path3 = `${options.apiPrefix || "/api"}/${routePath}`;
        const schema = schemaDiscovery.getSchema(moduleName, functionName);
        spec.paths[path3] = this.generatePathItem(moduleName, functionName, schema);
      }
    }
    return spec;
  }
  /**
   * Generate OpenAPI path item for a server function
   * @param {string} moduleName - Module name
   * @param {string} functionName - Function name
   * @param {any} schema - Validation schema
   * @returns {object} OpenAPI path item
   */
  generatePathItem(moduleName, functionName, schema) {
    const operationId = `${moduleName}_${functionName}`;
    const tags = [moduleName];
    const pathItem = {
      post: {
        operationId,
        tags,
        summary: `Execute ${functionName}`,
        description: `Execute the ${functionName} server action from ${moduleName} module`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: this.generateRequestSchema(schema)
            }
          }
        },
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Function result"
                }
              }
            }
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: this.getErrorSchema()
              }
            }
          },
          404: {
            description: "Function not found",
            content: {
              "application/json": {
                schema: this.getErrorSchema()
              }
            }
          },
          500: {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: this.getErrorSchema()
              }
            }
          }
        }
      }
    };
    return pathItem;
  }
  /**
   * Generate request schema for a server function
   * @param {any} schema - Validation schema
   * @returns {object} OpenAPI schema for request body
   */
  generateRequestSchema(schema) {
    if (!schema) {
      return {
        type: "array",
        description: "Function arguments array",
        items: {
          type: "object",
          description: "Function argument"
        }
      };
    }
    return {
      type: "array",
      description: "Function arguments",
      items: this.adapter.toOpenAPISchema(schema)
    };
  }
  /**
   * Get standard error response schema
   * @returns {object} OpenAPI error schema
   */
  getErrorSchema() {
    return {
      type: "object",
      properties: {
        error: {
          type: "string",
          description: "Error message"
        },
        details: {
          type: "string",
          description: "Error details"
        },
        validationErrors: {
          type: "array",
          description: "Validation errors (if applicable)",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Field path"
              },
              message: {
                type: "string",
                description: "Error message"
              },
              code: {
                type: "string",
                description: "Error code"
              }
            }
          }
        }
      },
      required: ["error"]
    };
  }
};

// ../../src/build-utils.js
import fs from "fs/promises";
var __vite_injected_original_import_meta_url = "file:///Users/helge/code/vite-server-actions/src/build-utils.js";
async function generateValidationCode(options, serverFunctions) {
  if (!options.validation?.enabled) {
    return {
      imports: "",
      setup: "",
      middlewareFactory: "",
      validationRuntime: ""
    };
  }
  const validationRuntimePath = new URL("./validation-runtime.js", __vite_injected_original_import_meta_url);
  const validationRuntime = `
// Embedded validation runtime
${await fs.readFile(validationRuntimePath, "utf-8")}
`;
  const setup = `
// Setup validation
const schemaDiscovery = new SchemaDiscovery();
const validationMiddleware = createValidationMiddleware({ schemaDiscovery });

// Register schemas from server actions
${Array.from(serverFunctions.entries()).map(([moduleName, { functions }]) => {
    return functions.map(
      (fn) => `
if (serverActions.${moduleName}.${fn}.schema) {
  schemaDiscovery.registerSchema('${moduleName}', '${fn}', serverActions.${moduleName}.${fn}.schema);
}`
    ).join("\n");
  }).join("\n")}
`;
  const middlewareFactory = `
function createContextualValidationMiddleware(moduleName, functionName) {
  return (req, res, next) => {
    req.validationContext = {
      moduleName,
      functionName,
      schema: serverActions[moduleName]?.[functionName]?.schema
    };
    return validationMiddleware(req, res, next);
  };
}
`;
  return {
    imports: "",
    setup,
    middlewareFactory,
    validationRuntime
  };
}

// ../../src/ast-parser.js
import { parse } from "file:///Users/helge/code/vite-server-actions/node_modules/@babel/parser/lib/index.js";
import traverse from "file:///Users/helge/code/vite-server-actions/node_modules/@babel/traverse/lib/index.js";
function extractExportedFunctions(code, filename = "unknown") {
  const functions = [];
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        "decorators-legacy",
        "dynamicImport",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "topLevelAwait",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods"
      ]
    });
    const traverseFn = traverse.default || traverse;
    traverseFn(ast, {
      // Handle: export function name() {} or export async function name() {}
      ExportNamedDeclaration(path3) {
        const declaration = path3.node.declaration;
        if (declaration && declaration.type === "FunctionDeclaration") {
          if (declaration.id) {
            functions.push({
              name: declaration.id.name,
              isAsync: declaration.async || false,
              isDefault: false,
              type: "function",
              params: extractDetailedParams(declaration.params),
              returnType: extractTypeAnnotation(declaration.returnType),
              jsdoc: extractJSDoc(path3.node.leadingComments)
            });
          }
        }
        if (declaration && declaration.type === "VariableDeclaration") {
          declaration.declarations.forEach((decl) => {
            if (decl.init && (decl.init.type === "ArrowFunctionExpression" || decl.init.type === "FunctionExpression")) {
              functions.push({
                name: decl.id.name,
                isAsync: decl.init.async || false,
                isDefault: false,
                type: "arrow",
                params: extractDetailedParams(decl.init.params),
                returnType: extractTypeAnnotation(decl.init.returnType),
                jsdoc: extractJSDoc(declaration.leadingComments)
              });
            }
          });
        }
      },
      // Handle: export default function() {} or export default async function name() {}
      ExportDefaultDeclaration(path3) {
        const declaration = path3.node.declaration;
        if (declaration.type === "FunctionDeclaration") {
          functions.push({
            name: declaration.id ? declaration.id.name : "default",
            isAsync: declaration.async || false,
            isDefault: true,
            type: "function",
            params: extractDetailedParams(declaration.params),
            returnType: extractTypeAnnotation(declaration.returnType),
            jsdoc: extractJSDoc(path3.node.leadingComments)
          });
        }
        if (declaration.type === "ArrowFunctionExpression" || declaration.type === "FunctionExpression") {
          functions.push({
            name: "default",
            isAsync: declaration.async || false,
            isDefault: true,
            type: "arrow",
            params: extractDetailedParams(declaration.params),
            returnType: extractTypeAnnotation(declaration.returnType),
            jsdoc: extractJSDoc(path3.node.leadingComments)
          });
        }
      },
      // Handle: export { functionName } or export { internalName as publicName }
      ExportSpecifier(path3) {
        const localName = path3.node.local.name;
        const exportedName = path3.node.exported.name;
        const binding = path3.scope.getBinding(localName);
        if (binding && binding.path.isFunctionDeclaration()) {
          functions.push({
            name: exportedName,
            isAsync: binding.path.node.async || false,
            isDefault: false,
            type: "renamed",
            params: extractDetailedParams(binding.path.node.params),
            returnType: extractTypeAnnotation(binding.path.node.returnType),
            jsdoc: extractJSDoc(binding.path.node.leadingComments)
          });
        }
        if (binding && binding.path.isVariableDeclarator()) {
          const init = binding.path.node.init;
          if (init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")) {
            functions.push({
              name: exportedName,
              isAsync: init.async || false,
              isDefault: false,
              type: "renamed-arrow",
              params: extractDetailedParams(init.params),
              returnType: extractTypeAnnotation(init.returnType),
              jsdoc: extractJSDoc(binding.path.node.leadingComments)
            });
          }
        }
      }
    });
  } catch (error) {
    console.error(`Failed to parse ${filename}: ${error.message}`);
    return [];
  }
  const uniqueFunctions = Array.from(new Map(
    functions.map((fn) => [fn.name, fn])
  ).values());
  return uniqueFunctions;
}
function isValidFunctionName(name) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}
function extractDetailedParams(params) {
  if (!params) return [];
  return params.map((param) => {
    const paramInfo = {
      name: "",
      type: null,
      defaultValue: null,
      isOptional: false,
      isRest: false
    };
    if (param.type === "Identifier") {
      paramInfo.name = param.name;
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    } else if (param.type === "AssignmentPattern") {
      paramInfo.name = param.left.name;
      paramInfo.type = extractTypeAnnotation(param.left.typeAnnotation);
      paramInfo.defaultValue = generateCode(param.right);
      paramInfo.isOptional = true;
    } else if (param.type === "RestElement") {
      paramInfo.name = `...${param.argument.name}`;
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isRest = true;
    } else if (param.type === "ObjectPattern") {
      paramInfo.name = generateCode(param);
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    } else if (param.type === "ArrayPattern") {
      paramInfo.name = generateCode(param);
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    }
    return paramInfo;
  });
}
function extractTypeAnnotation(typeAnnotation) {
  if (!typeAnnotation || !typeAnnotation.typeAnnotation) return null;
  return generateCode(typeAnnotation.typeAnnotation);
}
function extractJSDoc(comments) {
  if (!comments) return null;
  const jsdocComment = comments.find(
    (comment) => comment.type === "CommentBlock" && comment.value.startsWith("*")
  );
  return jsdocComment ? `/*${jsdocComment.value}*/` : null;
}
function generateCode(node) {
  if (!node) return "";
  try {
    switch (node.type) {
      case "Identifier":
        return node.name;
      case "StringLiteral":
        return `"${node.value}"`;
      case "NumericLiteral":
        return String(node.value);
      case "BooleanLiteral":
        return String(node.value);
      case "NullLiteral":
        return "null";
      case "TSStringKeyword":
        return "string";
      case "TSNumberKeyword":
        return "number";
      case "TSBooleanKeyword":
        return "boolean";
      case "TSAnyKeyword":
        return "any";
      case "TSUnknownKeyword":
        return "unknown";
      case "TSVoidKeyword":
        return "void";
      case "TSArrayType":
        return `${generateCode(node.elementType)}[]`;
      case "TSUnionType":
        return node.types.map((type) => generateCode(type)).join(" | ");
      case "TSLiteralType":
        return generateCode(node.literal);
      case "ObjectPattern":
        const props = node.properties.map((prop) => {
          if (prop.type === "ObjectProperty") {
            return prop.key.name;
          } else if (prop.type === "RestElement") {
            return `...${prop.argument.name}`;
          }
          return "";
        }).filter(Boolean);
        return `{${props.join(", ")}}`;
      case "ArrayPattern":
        const elements = node.elements.map(
          (elem, i) => elem ? elem.type === "Identifier" ? elem.name : `_${i}` : `_${i}`
        );
        return `[${elements.join(", ")}]`;
      default:
        return node.type || "unknown";
    }
  } catch (error) {
    return "unknown";
  }
}

// ../../src/type-generator.js
function generateTypeDefinitions(serverFunctions, options = {}) {
  let typeDefinitions = `// Auto-generated TypeScript definitions for Vite Server Actions
// This file is automatically updated when server actions change

`;
  typeDefinitions += `type ServerActionResult<T> = Promise<T>;
type ServerActionError = {
  error: boolean;
  status: number;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
};

`;
  for (const [moduleName, moduleInfo] of serverFunctions) {
    typeDefinitions += generateModuleTypes(moduleName, moduleInfo);
  }
  typeDefinitions += generateGlobalInterface(serverFunctions);
  return typeDefinitions;
}
function generateModuleTypes(moduleName, moduleInfo) {
  const { functions, filePath, functionDetails = [] } = moduleInfo;
  let moduleTypes = `// Types for ${filePath}
`;
  moduleTypes += `declare module "${filePath}" {
`;
  functionDetails.forEach((func) => {
    const signature = generateFunctionSignature(func);
    const jsdocComment = func.jsdoc ? formatJSDocForTS(func.jsdoc) : "";
    moduleTypes += `${jsdocComment}  export ${signature};
`;
  });
  moduleTypes += `}

`;
  return moduleTypes;
}
function generateFunctionSignature(func) {
  const { name, isAsync, params, returnType } = func;
  const paramList = params.map((param) => {
    let paramStr = param.name;
    if (param.type) {
      paramStr += `: ${param.type}`;
    } else {
      paramStr += `: any`;
    }
    if (param.isOptional && !param.name.includes("...")) {
      paramStr = paramStr.replace(":", "?:");
    }
    return paramStr;
  }).join(", ");
  let resultType = returnType || "any";
  if (isAsync) {
    resultType = `Promise<${resultType}>`;
  }
  return `function ${name}(${paramList}): ${resultType}`;
}
function generateJavaScriptSignature(func) {
  const { name, params } = func;
  const paramList = params.map((param) => {
    let paramStr = param.name;
    return paramStr;
  }).join(", ");
  return `function ${name}(${paramList})`;
}
function generateGlobalInterface(serverFunctions) {
  let globalInterface = `// Global server actions interface
declare global {
  namespace ServerActions {
`;
  for (const [moduleName, moduleInfo] of serverFunctions) {
    const { functionDetails = [] } = moduleInfo;
    globalInterface += `    namespace ${capitalizeFirst(moduleName)} {
`;
    functionDetails.forEach((func) => {
      const signature = generateFunctionSignature(func);
      const jsdocComment = func.jsdoc ? formatJSDocForTS(func.jsdoc, "      ") : "";
      globalInterface += `${jsdocComment}      ${signature};
`;
    });
    globalInterface += `    }
`;
  }
  globalInterface += `  }
}

export {};
`;
  return globalInterface;
}
function formatJSDocForTS(jsdoc, indent = "  ") {
  if (!jsdoc) return "";
  const lines = jsdoc.split("\n");
  const formattedLines = lines.map((line) => `${indent}${line.trim()}`);
  return formattedLines.join("\n") + "\n";
}
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function generateEnhancedClientProxy(moduleName, functionDetails, options, filePath) {
  const isDev = process.env.NODE_ENV !== "production";
  let clientProxy = `
// vite-server-actions: ${moduleName}
`;
  if (functionDetails.length > 0) {
    clientProxy += `// Auto-generated types for ${filePath}
`;
    functionDetails.forEach((func) => {
      if (func.jsdoc) {
        clientProxy += `${func.jsdoc}
`;
      }
    });
  }
  if (isDev) {
    clientProxy += `
// Development-only safety check
if (typeof window !== 'undefined') {
  const serverFileError = new Error(
    '[Vite Server Actions] SECURITY WARNING: Server file "${moduleName}" is being imported in client code! ' +
    'This could expose server-side code to the browser. Only import server actions through the plugin.'
  );
  serverFileError.name = 'ServerCodeInClientError';
  
  if (!window.__VITE_SERVER_ACTIONS_PROXY__) {
    console.error(serverFileError);
    console.error('Stack trace:', serverFileError.stack);
  }
}
`;
  }
  functionDetails.forEach((func) => {
    const routePath = options.routeTransform(filePath, func.name);
    const jsSignature = generateJavaScriptSignature(func);
    clientProxy += `
${func.jsdoc || `/**
 * Server action: ${func.name}
 */`}
export async ${jsSignature} {
  console.log("[Vite Server Actions] \u{1F680} - Executing ${func.name}");
  
  ${isDev ? `
  // Development-only: Mark that we're in a valid proxy context
  if (typeof window !== 'undefined') {
    window.__VITE_SERVER_ACTIONS_PROXY__ = true;
  }
  
  // Validate arguments in development
  if (arguments.length > 0) {
    const args = Array.from(arguments);
    
    // Check for functions
    if (args.some(arg => typeof arg === 'function')) {
      console.warn(
        '[Vite Server Actions] Warning: Functions cannot be serialized and sent to the server. ' +
        'Function arguments will be converted to null.'
      );
    }
    
    // Check argument count
    const requiredParams = ${JSON.stringify(func.params.filter((p) => !p.isOptional && !p.isRest))};
    const maxParams = ${func.params.filter((p) => !p.isRest).length};
    const hasRest = ${func.params.some((p) => p.isRest)};
    
    if (args.length < requiredParams.length) {
      console.warn(\`[Vite Server Actions] Warning: Function '${func.name}' expects at least \${requiredParams.length} arguments, got \${args.length}\`);
    }
    
    if (args.length > maxParams && !hasRest) {
      console.warn(\`[Vite Server Actions] Warning: Function '${func.name}' expects at most \${maxParams} arguments, got \${args.length}\`);
    }
    
    // Check for non-serializable types
    args.forEach((arg, index) => {
      if (arg instanceof Date) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a Date object. Consider passing as ISO string: \${arg.toISOString()}\`);
      } else if (arg instanceof RegExp) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a RegExp and cannot be serialized properly\`);
      } else if (arg && typeof arg === 'object' && arg.constructor !== Object && !Array.isArray(arg)) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a custom object instance that may not serialize properly\`);
      }
    });
  }
  ` : ""}
  
  try {
    const response = await fetch('${options.apiPrefix}/${routePath}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.from(arguments))
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { 
          error: true,
          status: response.status,
          message: 'Failed to parse error response',
          timestamp: new Date().toISOString()
        };
      }
      
      console.error("[Vite Server Actions] \u2757 - Error in ${func.name}:", errorData);
      
      const error = new Error(errorData.message || 'Server request failed');
      Object.assign(error, errorData);
      throw error;
    }

    console.log("[Vite Server Actions] \u2705 - ${func.name} executed successfully");
    const result = await response.json();
    
    ${isDev ? `
    // Development-only: Clear the proxy context
    if (typeof window !== 'undefined') {
      window.__VITE_SERVER_ACTIONS_PROXY__ = false;
    }
    ` : ""}
    
    return result;
    
  } catch (error) {
    console.error("[Vite Server Actions] \u2757 - Network or execution error in ${func.name}:", error.message);
    
    ${isDev ? `
    // Development-only: Clear the proxy context on error
    if (typeof window !== 'undefined') {
      window.__VITE_SERVER_ACTIONS_PROXY__ = false;
    }
    ` : ""}
    
    // Re-throw with more context if it's not already our custom error
    if (!error.status) {
      const networkError = new Error(\`Failed to execute server action '\${func.name}': \${error.message}\`);
      networkError.originalError = error;
      throw networkError;
    }
    
    throw error;
  }
}
`;
  });
  return clientProxy;
}

// ../../src/error-enhancer.js
function createEnhancedError(errorType, originalMessage, context = {}) {
  const { filePath, functionName, availableFunctions, suggestion } = context;
  let enhancedMessage = `[Vite Server Actions] ${errorType}: ${originalMessage}`;
  if (filePath) {
    enhancedMessage += `
  \u{1F4C1} File: ${filePath}`;
  }
  if (functionName) {
    enhancedMessage += `
  \u{1F527} Function: ${functionName}`;
  }
  if (availableFunctions && availableFunctions.length > 0) {
    enhancedMessage += `
  \u{1F4CB} Available functions: ${availableFunctions.join(", ")}`;
  }
  if (suggestion) {
    enhancedMessage += `
  \u{1F4A1} Suggestion: ${suggestion}`;
  }
  return enhancedMessage;
}
function enhanceFunctionNotFoundError(functionName, moduleName, availableFunctions = []) {
  const suggestions = [];
  const similarFunctions = availableFunctions.filter(
    (fn) => levenshteinDistance(fn, functionName) <= 2
  );
  if (similarFunctions.length > 0) {
    suggestions.push(`Did you mean: ${similarFunctions.join(", ")}?`);
  }
  const namingPatterns = [
    { pattern: /^get/, suggestion: "For data fetching, consider: fetch, load, or retrieve" },
    { pattern: /^create/, suggestion: "For creation, consider: add, insert, or save" },
    { pattern: /^update/, suggestion: "For updates, consider: edit, modify, or change" },
    { pattern: /^delete/, suggestion: "For deletion, consider: remove, destroy, or clear" }
  ];
  const matchingPattern = namingPatterns.find((p) => p.pattern.test(functionName));
  if (matchingPattern) {
    suggestions.push(matchingPattern.suggestion);
  }
  if (availableFunctions.length === 0) {
    suggestions.push("No functions are exported from this module. Make sure to export your functions.");
  }
  return {
    message: createEnhancedError(
      "Function Not Found",
      `Function '${functionName}' not found in module '${moduleName}'`,
      {
        functionName,
        availableFunctions,
        suggestion: suggestions.join(" ")
      }
    ),
    code: "FUNCTION_NOT_FOUND",
    suggestions
  };
}
function enhanceParsingError(filePath, originalError) {
  const suggestions = [];
  if (originalError.message.includes("Unexpected token")) {
    suggestions.push("Check for syntax errors in your server action file");
    suggestions.push("Ensure all functions are properly exported");
  }
  if (originalError.message.includes("Identifier")) {
    suggestions.push("Function names must be valid JavaScript identifiers");
    suggestions.push("Function names cannot start with numbers or contain special characters");
  }
  if (originalError.message.includes("duplicate")) {
    suggestions.push("Each function name must be unique within the same file");
    suggestions.push("Consider renaming duplicate functions or using different export patterns");
  }
  return {
    message: createEnhancedError(
      "Parsing Error",
      `Failed to parse server action file: ${originalError.message}`,
      {
        filePath,
        suggestion: suggestions.join(" ")
      }
    ),
    code: "PARSE_ERROR",
    suggestions
  };
}
function enhanceModuleLoadError(modulePath, originalError) {
  const suggestions = [];
  if (originalError.code === "ENOENT") {
    suggestions.push("Make sure the file exists and the path is correct");
    suggestions.push("Check that your build process hasn't moved or renamed the file");
  }
  if (originalError.message.includes("import")) {
    suggestions.push("Verify all import statements in your server action file");
    suggestions.push("Make sure imported modules are installed and available");
  }
  if (originalError.message.includes("export")) {
    suggestions.push("Ensure your functions are properly exported");
    suggestions.push("Use 'export function' or 'export const' for your server actions");
  }
  return {
    message: createEnhancedError(
      "Module Load Error",
      `Failed to load server action module: ${originalError.message}`,
      {
        filePath: modulePath,
        suggestion: suggestions.join(" ")
      }
    ),
    code: "MODULE_LOAD_ERROR",
    suggestions
  };
}
function createDevelopmentWarning(warningType, message, context = {}) {
  let warning = `[Vite Server Actions] \u26A0\uFE0F ${warningType}: ${message}`;
  if (context.filePath) {
    warning += `
  \u{1F4C1} File: ${context.filePath}`;
  }
  if (context.suggestion) {
    warning += `
  \u{1F4A1} Tip: ${context.suggestion}`;
  }
  return warning;
}
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ../../src/dev-validator.js
function validateFunctionSignature(func, filePath) {
  const warnings = [];
  if (func.params && func.params.length > 0) {
    const untypedParams = func.params.filter((param) => !param.type);
    if (untypedParams.length > 0) {
      warnings.push(createDevelopmentWarning(
        "Missing Type Annotations",
        `Parameters ${untypedParams.map((p) => p.name).join(", ")} in '${func.name}' lack type annotations`,
        {
          filePath,
          suggestion: "Add TypeScript types for better development experience and type safety"
        }
      ));
    }
  }
  if (!func.returnType && func.isAsync) {
    warnings.push(createDevelopmentWarning(
      "Missing Return Type",
      `Async function '${func.name}' should have a return type annotation`,
      {
        filePath,
        suggestion: "Add return type like: Promise<MyReturnType>"
      }
    ));
  }
  if (!func.jsdoc) {
    warnings.push(createDevelopmentWarning(
      "Missing Documentation",
      `Function '${func.name}' lacks JSDoc documentation`,
      {
        filePath,
        suggestion: "Add JSDoc comments to document what this function does"
      }
    ));
  }
  if (func.params) {
    const complexParams = func.params.filter(
      (param) => param.name.includes("{") || param.name.includes("[")
    );
    if (complexParams.length > 0) {
      warnings.push(createDevelopmentWarning(
        "Complex Parameter Destructuring",
        `Function '${func.name}' uses complex destructuring that might be hard to serialize`,
        {
          filePath,
          suggestion: "Consider using simple parameters and destructure inside the function"
        }
      ));
    }
  }
  return warnings;
}
function validateFileStructure(functionDetails, filePath) {
  const warnings = [];
  if (functionDetails.length === 0) {
    warnings.push(createDevelopmentWarning(
      "No Functions Found",
      "No exported functions found in server action file",
      {
        filePath,
        suggestion: "Make sure to export your functions: export async function myFunction() {}"
      }
    ));
    return warnings;
  }
  if (functionDetails.length > 10) {
    warnings.push(createDevelopmentWarning(
      "Large File",
      `File contains ${functionDetails.length} functions. Consider splitting into smaller modules`,
      {
        filePath,
        suggestion: "Group related functions and split into multiple .server.js files"
      }
    ));
  }
  const functionNames = functionDetails.map((fn) => fn.name);
  const hasInconsistentNaming = checkNamingConsistency(functionNames);
  if (hasInconsistentNaming) {
    warnings.push(createDevelopmentWarning(
      "Inconsistent Naming",
      "Function names use inconsistent naming patterns",
      {
        filePath,
        suggestion: "Use consistent naming: camelCase (getUserById) or snake_case (get_user_by_id)"
      }
    ));
  }
  return warnings;
}
function checkNamingConsistency(functionNames) {
  if (functionNames.length < 2) return false;
  const camelCaseCount = functionNames.filter((name) => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
  const snakeCaseCount = functionNames.filter((name) => /^[a-z][a-z0-9_]*$/.test(name) && name.includes("_")).length;
  const pascalCaseCount = functionNames.filter((name) => /^[A-Z][a-zA-Z0-9]*$/.test(name)).length;
  const styles = [camelCaseCount, snakeCaseCount, pascalCaseCount].filter((count) => count > 0);
  return styles.length > 1 && Math.max(...styles) < functionNames.length * 0.8;
}
function createDevelopmentFeedback(serverFunctions) {
  let feedback = "\n[Vite Server Actions] \u{1F4CB} Development Feedback:\n";
  const totalFunctions = Array.from(serverFunctions.values()).reduce((sum, module) => sum + (module.functions?.length || 0), 0);
  feedback += `  \u{1F4CA} Found ${totalFunctions} server actions across ${serverFunctions.size} modules
`;
  for (const [moduleName, moduleInfo] of serverFunctions) {
    const { functions, filePath } = moduleInfo;
    feedback += `  \u{1F4C1} ${filePath}: ${functions.join(", ")}
`;
  }
  feedback += "\n  \u{1F4A1} Tips:\n";
  feedback += "    \u2022 Add TypeScript types for better IntelliSense\n";
  feedback += "    \u2022 Use Zod schemas for runtime validation\n";
  feedback += "    \u2022 Keep functions focused and well-documented\n";
  return feedback;
}
function validateSchemaAttachment(moduleExports, functionNames, filePath) {
  const suggestions = [];
  functionNames.forEach((funcName) => {
    const func = moduleExports[funcName];
    if (func && typeof func === "function") {
      if (!func.schema) {
        suggestions.push(createDevelopmentWarning(
          "Missing Validation Schema",
          `Function '${funcName}' has no attached Zod schema`,
          {
            filePath,
            suggestion: `Add: ${funcName}.schema = z.object({ /* your schema */ });`
          }
        ));
      }
    }
  });
  return suggestions;
}

// ../../src/index.js
var pathUtils = {
  /**
   * Default path normalizer - creates underscore-separated module names (preserves original behavior)
   * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
   * @returns {string} - Normalized module name (e.g., "src_actions_todo")
   */
  createModuleName: (filePath) => {
    return filePath.replace(/\//g, "_").replace(/\./g, "_").replace(/_server_(js|ts)$/, "");
  },
  /**
   * Clean route transformer - creates hierarchical paths: /api/actions/todo/create
   * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
   * @param {string} functionName - Function name (e.g., "create")
   * @returns {string} - Clean route (e.g., "actions/todo/create")
   */
  createCleanRoute: (filePath, functionName) => {
    const cleanPath = filePath.replace(/^src\//, "").replace(/\.server\.(js|ts)$/, "");
    return `${cleanPath}/${functionName}`;
  },
  /**
   * Legacy route transformer - creates underscore-separated paths: /api/src_actions_todo/create
   * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
   * @param {string} functionName - Function name (e.g., "create")
   * @returns {string} - Legacy route (e.g., "src_actions_todo/create")
   */
  createLegacyRoute: (filePath, functionName) => {
    const legacyPath = filePath.replace(/\//g, "_").replace(/\.server\.(js|ts)$/, "");
    return `${legacyPath}/${functionName}`;
  },
  /**
   * Minimal route transformer - keeps original structure: /api/actions/todo.server/create
   * @param {string} filePath - Relative file path (e.g., "actions/todo.server.js")
   * @param {string} functionName - Function name (e.g., "create")
   * @returns {string} - Minimal route (e.g., "actions/todo.server/create")
   */
  createMinimalRoute: (filePath, functionName) => {
    const minimalPath = filePath.replace(/\.(js|ts)$/, "");
    return `${minimalPath}/${functionName}`;
  }
};
var DEFAULT_OPTIONS = {
  apiPrefix: "/api",
  include: ["**/*.server.js", "**/*.server.ts"],
  exclude: [],
  middleware: [],
  moduleNameTransform: pathUtils.createModuleName,
  routeTransform: (filePath, functionName) => {
    const cleanPath = filePath.replace(/^src\//, "").replace(/\.server\.(js|ts)$/, "");
    return `${cleanPath}/${functionName}`;
  },
  validation: {
    enabled: false,
    adapter: "zod"
  }
};
function shouldProcessFile(filePath, options) {
  const includePatterns = Array.isArray(options.include) ? options.include : [options.include];
  const excludePatterns = Array.isArray(options.exclude) ? options.exclude : [options.exclude];
  const isIncluded = includePatterns.some((pattern) => minimatch(filePath, pattern));
  const isExcluded = excludePatterns.length > 0 && excludePatterns.some((pattern) => minimatch(filePath, pattern));
  return isIncluded && !isExcluded;
}
function serverActions(userOptions = {}) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    validation: { ...DEFAULT_OPTIONS.validation, ...userOptions.validation },
    openAPI: {
      enabled: false,
      info: {
        title: "Server Actions API",
        version: "1.0.0",
        description: "Auto-generated API documentation for Vite Server Actions"
      },
      docsPath: "/api/docs",
      specPath: "/api/openapi.json",
      swaggerUI: true,
      ...userOptions.openAPI
    }
  };
  const serverFunctions = /* @__PURE__ */ new Map();
  const schemaDiscovery = defaultSchemaDiscovery;
  let app;
  let openAPIGenerator;
  let validationMiddleware = null;
  let viteConfig = null;
  if (options.openAPI.enabled) {
    openAPIGenerator = new OpenAPIGenerator({
      info: options.openAPI.info
    });
  }
  if (options.validation.enabled) {
    validationMiddleware = createValidationMiddleware({
      schemaDiscovery
    });
  }
  return {
    name: "vite-plugin-server-actions",
    configResolved(config) {
      viteConfig = config;
    },
    configureServer(server) {
      app = express();
      app.use(express.json());
      if (server.watcher) {
        server.watcher.on("change", (file) => {
          if (shouldProcessFile(file, options)) {
            for (const [moduleName, moduleInfo] of serverFunctions.entries()) {
              if (moduleInfo.id === file) {
                serverFunctions.delete(moduleName);
                schemaDiscovery.clear();
                console.log(`[HMR] Cleaned up server module: ${moduleName}`);
              }
            }
          }
        });
      }
      if (process.env.NODE_ENV !== "production" && options.openAPI.enabled && openAPIGenerator) {
        app.get(options.openAPI.specPath, (req, res) => {
          const openAPISpec = openAPIGenerator.generateSpec(serverFunctions, schemaDiscovery, {
            apiPrefix: options.apiPrefix,
            routeTransform: options.routeTransform
          });
          if (serverFunctions.size === 0) {
            openAPISpec.info.description = (openAPISpec.info.description || "") + "\n\nNote: No server functions found yet. Try refreshing after accessing your app to trigger module loading.";
          }
          res.json(openAPISpec);
        });
        if (options.openAPI.swaggerUI) {
          try {
            import("file:///Users/helge/code/vite-server-actions/node_modules/swagger-ui-express/index.js").then(({ default: swaggerUi2 }) => {
              const docsPath = options.openAPI.docsPath;
              app.use(
                docsPath,
                swaggerUi2.serve,
                swaggerUi2.setup(null, {
                  swaggerOptions: {
                    url: options.openAPI.specPath
                  }
                })
              );
              server.httpServer?.on("listening", () => {
                const address = server.httpServer.address();
                const port = address?.port || 5173;
                const host = "localhost";
                global.setTimeout(() => {
                  if (viteConfig?.logger) {
                    console.log(`  \x1B[2;32m\u279C\x1B[0m  API Docs: http://${host}:${port}${docsPath}`);
                    console.log(`  \x1B[2;32m\u279C\x1B[0m  OpenAPI:  http://${host}:${port}${options.openAPI.specPath}`);
                  } else {
                    console.log(`\u{1F4D6} API Documentation: http://${host}:${port}${docsPath}`);
                    console.log(`\u{1F4C4} OpenAPI Spec: http://${host}:${port}${options.openAPI.specPath}`);
                  }
                }, 50);
              });
            }).catch((error) => {
              console.warn("Swagger UI setup failed:", error.message);
            });
          } catch (error) {
            console.warn("Swagger UI setup failed:", error.message);
          }
        }
      }
      server.middlewares.use(app);
      if (process.env.NODE_ENV === "development") {
        server.httpServer?.on("listening", () => {
          global.setTimeout(() => {
            if (serverFunctions.size > 0) {
              console.log(createDevelopmentFeedback(serverFunctions));
            }
          }, 100);
        });
      }
    },
    async resolveId(source, importer) {
      if (importer && shouldProcessFile(source, options)) {
        const resolvedPath = path2.resolve(path2.dirname(importer), source);
        return resolvedPath;
      }
    },
    async load(id) {
      if (shouldProcessFile(id, options)) {
        try {
          const code = await fs2.readFile(id, "utf-8");
          const sanitizedPath = sanitizePath(id, process.cwd());
          if (!sanitizedPath) {
            throw new Error(`Invalid file path detected: ${id}`);
          }
          let relativePath = path2.relative(process.cwd(), sanitizedPath);
          relativePath = relativePath.replace(/\\/g, "/").replace(/^\//, "");
          const moduleName = createSecureModuleName(options.moduleNameTransform(relativePath));
          if (!isValidModuleName(moduleName)) {
            throw new Error(`Invalid server module name: ${moduleName}`);
          }
          const exportedFunctions = extractExportedFunctions(code, id);
          const functions = [];
          const functionDetails = [];
          for (const fn of exportedFunctions) {
            if (fn.isDefault) {
              console.warn(createDevelopmentWarning(
                "Default Export Skipped",
                `Default exports are not currently supported`,
                {
                  filePath: relativePath,
                  suggestion: "Use named exports instead: export async function myFunction() {}"
                }
              ));
              continue;
            }
            if (!isValidFunctionName(fn.name)) {
              console.warn(createDevelopmentWarning(
                "Invalid Function Name",
                `Function name '${fn.name}' is not a valid JavaScript identifier`,
                {
                  filePath: relativePath,
                  suggestion: "Function names must start with a letter, $, or _ and contain only letters, numbers, $, and _"
                }
              ));
              continue;
            }
            if (!fn.isAsync) {
              console.warn(createDevelopmentWarning(
                "Non-Async Function",
                `Function '${fn.name}' is not async. Server actions should typically be async`,
                {
                  filePath: relativePath,
                  suggestion: "Consider changing to: export async function " + fn.name + "() {}"
                }
              ));
            }
            functions.push(fn.name);
            functionDetails.push(fn);
          }
          const uniqueFunctions = [...new Set(functions)];
          if (uniqueFunctions.length !== functions.length) {
            console.warn(`Duplicate function names detected in ${id}`);
          }
          serverFunctions.set(moduleName, {
            functions: uniqueFunctions,
            functionDetails,
            id,
            filePath: relativePath
          });
          if (process.env.NODE_ENV === "development") {
            const fileWarnings = validateFileStructure(functionDetails, relativePath);
            fileWarnings.forEach((warning) => console.warn(warning));
            functionDetails.forEach((func) => {
              const funcWarnings = validateFunctionSignature(func, relativePath);
              funcWarnings.forEach((warning) => console.warn(warning));
            });
          }
          if (options.validation.enabled && process.env.NODE_ENV !== "production") {
            try {
              const module = await import(id);
              schemaDiscovery.discoverFromModule(module, moduleName);
              if (process.env.NODE_ENV === "development") {
                const schemaWarnings = validateSchemaAttachment(module, uniqueFunctions, relativePath);
                schemaWarnings.forEach((warning) => console.warn(warning));
              }
            } catch (error) {
              const enhancedError = enhanceModuleLoadError(id, error);
              console.warn(enhancedError.message);
              if (process.env.NODE_ENV === "development" && enhancedError.suggestions) {
                enhancedError.suggestions.forEach((suggestion) => {
                  console.info(`  \u{1F4A1} ${suggestion}`);
                });
              }
            }
          }
          if (process.env.NODE_ENV !== "production" && app) {
            const middlewares = Array.isArray(options.middleware) ? [...options.middleware] : options.middleware ? [options.middleware] : [];
            if (validationMiddleware) {
              middlewares.push(validationMiddleware);
            }
            uniqueFunctions.forEach((functionName) => {
              const routePath = options.routeTransform(relativePath, functionName);
              const endpoint = `${options.apiPrefix}/${routePath}`;
              const contextMiddlewares = [...middlewares];
              if (validationMiddleware && options.validation.enabled) {
                const lastIdx = contextMiddlewares.length - 1;
                if (contextMiddlewares[lastIdx] === validationMiddleware) {
                  contextMiddlewares[lastIdx] = (req, res, next) => {
                    const schema = schemaDiscovery.getSchema(moduleName, functionName);
                    req.validationContext = {
                      moduleName,
                      // For error messages
                      functionName,
                      // For error messages
                      schema
                      // Direct schema access
                    };
                    return validationMiddleware(req, res, next);
                  };
                }
              }
              app.post(endpoint, ...contextMiddlewares, async (req, res) => {
                try {
                  const module = await import(id);
                  if (typeof module[functionName] !== "function") {
                    const availableFunctions = Object.keys(module).filter(
                      (key) => typeof module[key] === "function"
                    );
                    const enhancedError = enhanceFunctionNotFoundError(
                      functionName,
                      moduleName,
                      availableFunctions
                    );
                    throw new Error(enhancedError.message);
                  }
                  if (!Array.isArray(req.body)) {
                    throw new Error("Request body must be an array of function arguments");
                  }
                  const result = await module[functionName](...req.body);
                  res.json(result || "* No response *");
                } catch (error) {
                  console.error(`Error in ${functionName}: ${error.message}`);
                  if (error.message.includes("not found") || error.message.includes("not a function")) {
                    const availableFunctionsMatch = error.message.match(/Available functions: ([^]+)/);
                    const availableFunctions = availableFunctionsMatch ? availableFunctionsMatch[1].split(", ") : [];
                    res.status(404).json(createErrorResponse(
                      404,
                      "Function not found",
                      "FUNCTION_NOT_FOUND",
                      {
                        functionName,
                        moduleName,
                        availableFunctions: availableFunctions.length > 0 ? availableFunctions : void 0,
                        suggestion: `Try one of: ${availableFunctions.join(", ") || "none available"}`
                      }
                    ));
                  } else if (error.message.includes("Request body")) {
                    res.status(400).json(createErrorResponse(
                      400,
                      error.message,
                      "INVALID_REQUEST_BODY",
                      {
                        suggestion: "Send an array of arguments: [arg1, arg2, ...]"
                      }
                    ));
                  } else {
                    res.status(500).json(createErrorResponse(
                      500,
                      "Internal server error",
                      "INTERNAL_ERROR",
                      process.env.NODE_ENV !== "production" ? {
                        message: error.message,
                        stack: error.stack,
                        suggestion: "Check server logs for more details"
                      } : { suggestion: "Contact support if this persists" }
                    ));
                  }
                }
              });
            });
          }
          if (functionDetails.length > 0) {
            return generateEnhancedClientProxy(moduleName, functionDetails, options, relativePath);
          } else {
            return generateClientProxy(moduleName, uniqueFunctions, options, relativePath);
          }
        } catch (error) {
          const enhancedError = enhanceParsingError(id, error);
          console.error(enhancedError.message);
          if (process.env.NODE_ENV === "development" && enhancedError.suggestions.length > 0) {
            console.info("[Vite Server Actions] \u{1F4A1} Suggestions:");
            enhancedError.suggestions.forEach((suggestion) => {
              console.info(`  \u2022 ${suggestion}`);
            });
          }
          return `// Failed to load server actions from ${id}
// Error: ${error.message}
// ${enhancedError.suggestions.length > 0 ? "Suggestions: " + enhancedError.suggestions.join(", ") : ""}`;
        }
      }
    },
    transform(code, id) {
      return null;
    },
    async generateBundle(outputOptions, bundle) {
      const virtualEntryId = "virtual:server-actions-entry";
      let virtualModuleContent = "";
      for (const [moduleName, { id }] of serverFunctions) {
        virtualModuleContent += `import * as ${moduleName} from '${id}';
`;
      }
      virtualModuleContent += `export { ${Array.from(serverFunctions.keys()).join(", ")} };`;
      const build = await rollup({
        input: virtualEntryId,
        plugins: [
          {
            name: "virtual",
            resolveId(id) {
              if (id === virtualEntryId) {
                return id;
              }
            },
            load(id) {
              if (id === virtualEntryId) {
                return virtualModuleContent;
              }
            }
          },
          {
            name: "external-modules",
            resolveId(source) {
              if (!shouldProcessFile(source, options) && !source.startsWith(".") && !path2.isAbsolute(source)) {
                return { id: source, external: true };
              }
            }
          }
        ]
      });
      const { output } = await build.generate({ format: "es" });
      if (output.length === 0) {
        throw new Error("Failed to bundle server functions");
      }
      const bundledCode = output[0].code;
      this.emitFile({
        type: "asset",
        fileName: "actions.js",
        source: bundledCode
      });
      const typeDefinitions = generateTypeDefinitions(serverFunctions, options);
      this.emitFile({
        type: "asset",
        fileName: "actions.d.ts",
        source: typeDefinitions
      });
      let openAPISpec = null;
      if (options.openAPI.enabled) {
        openAPISpec = openAPIGenerator.generateSpec(serverFunctions, schemaDiscovery, {
          apiPrefix: options.apiPrefix,
          routeTransform: options.routeTransform
        });
        this.emitFile({
          type: "asset",
          fileName: "openapi.json",
          source: JSON.stringify(openAPISpec, null, 2)
        });
      }
      const validationCode = await generateValidationCode(options, serverFunctions);
      const serverCode = `
        import express from 'express';
        import * as serverActions from './actions.js';
        ${options.openAPI.enabled && options.openAPI.swaggerUI ? "import swaggerUi from 'swagger-ui-express';" : ""}
        ${options.openAPI.enabled ? "import { readFileSync } from 'fs';\nimport { fileURLToPath } from 'url';\nimport { dirname, join } from 'path';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst openAPISpec = JSON.parse(readFileSync(join(__dirname, 'openapi.json'), 'utf-8'));" : ""}
        ${validationCode.imports}
        ${validationCode.validationRuntime}

        const app = express();
        ${validationCode.setup}
        ${validationCode.middlewareFactory}

        // Middleware
        // --------------------------------------------------
        app.use(express.json());
        app.use(express.static('dist'));

				// Server functions
				// --------------------------------------------------
        ${Array.from(serverFunctions.entries()).flatMap(
        ([moduleName, { functions, filePath }]) => functions.map((functionName) => {
          const routePath = options.routeTransform(filePath, functionName);
          const middlewareCall = options.validation?.enabled ? `createContextualValidationMiddleware('${moduleName}', '${functionName}'), ` : "";
          return `
            app.post('${options.apiPrefix}/${routePath}', ${middlewareCall}async (req, res) => {
              try {
                const result = await serverActions.${moduleName}.${functionName}(...req.body);
                res.json(result || "* No response *");
              } catch (error) {
                console.error(\`Error in ${functionName}: \${error.message}\`);
                res.status(500).json({ error: error.message });
              }
            });
          `;
        }).join("\n").trim()
      ).join("\n").trim()}

				${options.openAPI.enabled ? `
				// OpenAPI endpoints
				// --------------------------------------------------
				app.get('${options.openAPI.specPath}', (req, res) => {
					res.json(openAPISpec);
				});
				
				${options.openAPI.swaggerUI ? `
				// Swagger UI
				app.use('${options.openAPI.docsPath}', swaggerUi.serve, swaggerUi.setup(openAPISpec));
				` : ""}
				` : ""}

				// Start server
				// --------------------------------------------------
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
					console.log(\`\u{1F680} Server listening: http://localhost:\${port}\`);
					${options.openAPI.enabled ? `
					console.log(\`\u{1F4D6} API Documentation: http://localhost:\${port}${options.openAPI.docsPath}\`);
					console.log(\`\u{1F4C4} OpenAPI Spec: http://localhost:\${port}${options.openAPI.specPath}\`);
					` : ""}
				});

        // List all server functions
				// --------------------------------------------------
      `;
      this.emitFile({
        type: "asset",
        fileName: "server.js",
        source: serverCode
      });
    }
  };
}
function generateClientProxy(moduleName, functions, options, filePath) {
  const isDev = process.env.NODE_ENV !== "production";
  let clientProxy = `
// vite-server-actions: ${moduleName}
`;
  if (isDev) {
    clientProxy += `
// Development-only safety check
if (typeof window !== 'undefined') {
  // This code is running in the browser
  const serverFileError = new Error(
    '[Vite Server Actions] SECURITY WARNING: Server file "${moduleName}" is being imported in client code! ' +
    'This could expose server-side code to the browser. Only import server actions through the plugin.'
  );
  serverFileError.name = 'ServerCodeInClientError';
  
  // Check if we're in a server action proxy context
  if (!window.__VITE_SERVER_ACTIONS_PROXY__) {
    console.error(serverFileError);
    // In development, we'll warn but not throw to avoid breaking HMR
    console.error('Stack trace:', serverFileError.stack);
  }
}
`;
  }
  functions.forEach((functionName) => {
    const routePath = options.routeTransform(filePath, functionName);
    clientProxy += `
      export async function ${functionName}(...args) {
      	console.log("[Vite Server Actions] \u{1F680} - Executing ${functionName}");
        
        ${isDev ? `
        // Development-only: Mark that we're in a valid proxy context
        if (typeof window !== 'undefined') {
          window.__VITE_SERVER_ACTIONS_PROXY__ = true;
        }
        
        // Validate arguments in development
        if (args.some(arg => typeof arg === 'function')) {
          console.warn(
            '[Vite Server Actions] Warning: Functions cannot be serialized and sent to the server. ' +
            'Function arguments will be converted to null.'
          );
        }
        ` : ""}
        
        try {
          const response = await fetch('${options.apiPrefix}/${routePath}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args)
          });

          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { error: 'Unknown error', details: 'Failed to parse error response' };
            }
            
            console.error("[Vite Server Actions] \u2757 - Error in ${functionName}:", errorData);
            
            const error = new Error(errorData.error || 'Server request failed');
            error.details = errorData.details;
            error.status = response.status;
            throw error;
          }

          console.log("[Vite Server Actions] \u2705 - ${functionName} executed successfully");
          const result = await response.json();
          
          ${isDev ? `
          // Development-only: Clear the proxy context
          if (typeof window !== 'undefined') {
            window.__VITE_SERVER_ACTIONS_PROXY__ = false;
          }
          ` : ""}
          
          return result;
          
        } catch (error) {
          console.error("[Vite Server Actions] \u2757 - Network or execution error in ${functionName}:", error.message);
          
          ${isDev ? `
          // Development-only: Clear the proxy context on error
          if (typeof window !== 'undefined') {
            window.__VITE_SERVER_ACTIONS_PROXY__ = false;
          }
          ` : ""}
          
          // Re-throw with more context if it's not already our custom error
          if (!error.details) {
            const networkError = new Error(\`Failed to execute server action '\${functionName}': \${error.message}\`);
            networkError.originalError = error;
            throw networkError;
          }
          
          throw error;
        }
      }
    `;
  });
  return clientProxy;
}

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    serverActions({
      validation: {
        enabled: true
      },
      openAPI: {
        enabled: true,
        info: {
          title: "Vue Todo App API",
          version: "1.0.0",
          description: "API documentation for the Vue Todo App"
        }
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiLi4vLi4vc3JjL2luZGV4LmpzIiwgIi4uLy4uL3NyYy92YWxpZGF0aW9uLmpzIiwgIi4uLy4uL3NyYy9zZWN1cml0eS5qcyIsICIuLi8uLi9zcmMvb3BlbmFwaS5qcyIsICIuLi8uLi9zcmMvYnVpbGQtdXRpbHMuanMiLCAiLi4vLi4vc3JjL2FzdC1wYXJzZXIuanMiLCAiLi4vLi4vc3JjL3R5cGUtZ2VuZXJhdG9yLmpzIiwgIi4uLy4uL3NyYy9lcnJvci1lbmhhbmNlci5qcyIsICIuLi8uLi9zcmMvZGV2LXZhbGlkYXRvci5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvZXhhbXBsZXMvdnVlLXRvZG8tYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL2V4YW1wbGVzL3Z1ZS10b2RvLWFwcC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL2V4YW1wbGVzL3Z1ZS10b2RvLWFwcC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgdnVlIGZyb20gXCJAdml0ZWpzL3BsdWdpbi12dWVcIjtcbmltcG9ydCBzZXJ2ZXJBY3Rpb25zIGZyb20gXCIuLi8uLi9zcmMvaW5kZXguanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcblx0cGx1Z2luczogW1xuXHRcdHZ1ZSgpLFxuXHRcdHNlcnZlckFjdGlvbnMoe1xuXHRcdFx0dmFsaWRhdGlvbjoge1xuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxuXHRcdFx0fSxcblx0XHRcdG9wZW5BUEk6IHtcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcblx0XHRcdFx0aW5mbzoge1xuXHRcdFx0XHRcdHRpdGxlOiBcIlZ1ZSBUb2RvIEFwcCBBUElcIixcblx0XHRcdFx0XHR2ZXJzaW9uOiBcIjEuMC4wXCIsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQVBJIGRvY3VtZW50YXRpb24gZm9yIHRoZSBWdWUgVG9kbyBBcHBcIixcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fSksXG5cdF0sXG59KTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjL2luZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjL2luZGV4LmpzXCI7aW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCBleHByZXNzIGZyb20gXCJleHByZXNzXCI7XG5pbXBvcnQgeyByb2xsdXAgfSBmcm9tIFwicm9sbHVwXCI7XG5pbXBvcnQgeyBtaW5pbWF0Y2ggfSBmcm9tIFwibWluaW1hdGNoXCI7XG5pbXBvcnQgeyBtaWRkbGV3YXJlIH0gZnJvbSBcIi4vbWlkZGxld2FyZS5qc1wiO1xuaW1wb3J0IHsgZGVmYXVsdFNjaGVtYURpc2NvdmVyeSwgY3JlYXRlVmFsaWRhdGlvbk1pZGRsZXdhcmUgfSBmcm9tIFwiLi92YWxpZGF0aW9uLmpzXCI7XG5pbXBvcnQgeyBPcGVuQVBJR2VuZXJhdG9yLCBzZXR1cE9wZW5BUElFbmRwb2ludHMgfSBmcm9tIFwiLi9vcGVuYXBpLmpzXCI7XG5pbXBvcnQgeyBnZW5lcmF0ZVZhbGlkYXRpb25Db2RlIH0gZnJvbSBcIi4vYnVpbGQtdXRpbHMuanNcIjtcbmltcG9ydCB7IGV4dHJhY3RFeHBvcnRlZEZ1bmN0aW9ucywgaXNWYWxpZEZ1bmN0aW9uTmFtZSB9IGZyb20gXCIuL2FzdC1wYXJzZXIuanNcIjtcbmltcG9ydCB7IGdlbmVyYXRlVHlwZURlZmluaXRpb25zLCBnZW5lcmF0ZUVuaGFuY2VkQ2xpZW50UHJveHkgfSBmcm9tIFwiLi90eXBlLWdlbmVyYXRvci5qc1wiO1xuaW1wb3J0IHsgc2FuaXRpemVQYXRoLCBpc1ZhbGlkTW9kdWxlTmFtZSwgY3JlYXRlU2VjdXJlTW9kdWxlTmFtZSwgY3JlYXRlRXJyb3JSZXNwb25zZSB9IGZyb20gXCIuL3NlY3VyaXR5LmpzXCI7XG5pbXBvcnQgeyBcblx0ZW5oYW5jZUZ1bmN0aW9uTm90Rm91bmRFcnJvciwgXG5cdGVuaGFuY2VQYXJzaW5nRXJyb3IsIFxuXHRlbmhhbmNlVmFsaWRhdGlvbkVycm9yLFxuXHRlbmhhbmNlTW9kdWxlTG9hZEVycm9yLFxuXHRjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcgXG59IGZyb20gXCIuL2Vycm9yLWVuaGFuY2VyLmpzXCI7XG5pbXBvcnQgeyBcblx0dmFsaWRhdGVGdW5jdGlvblNpZ25hdHVyZSwgXG5cdHZhbGlkYXRlRmlsZVN0cnVjdHVyZSwgXG5cdGNyZWF0ZURldmVsb3BtZW50RmVlZGJhY2ssXG5cdHZhbGlkYXRlU2NoZW1hQXR0YWNobWVudCBcbn0gZnJvbSBcIi4vZGV2LXZhbGlkYXRvci5qc1wiO1xuXG4vLyBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgcGF0aCB0cmFuc2Zvcm1hdGlvblxuZXhwb3J0IGNvbnN0IHBhdGhVdGlscyA9IHtcblx0LyoqXG5cdCAqIERlZmF1bHQgcGF0aCBub3JtYWxpemVyIC0gY3JlYXRlcyB1bmRlcnNjb3JlLXNlcGFyYXRlZCBtb2R1bGUgbmFtZXMgKHByZXNlcnZlcyBvcmlnaW5hbCBiZWhhdmlvcilcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gUmVsYXRpdmUgZmlsZSBwYXRoIChlLmcuLCBcInNyYy9hY3Rpb25zL3RvZG8uc2VydmVyLmpzXCIpXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IC0gTm9ybWFsaXplZCBtb2R1bGUgbmFtZSAoZS5nLiwgXCJzcmNfYWN0aW9uc190b2RvXCIpXG5cdCAqL1xuXHRjcmVhdGVNb2R1bGVOYW1lOiAoZmlsZVBhdGgpID0+IHtcblx0XHRyZXR1cm4gZmlsZVBhdGhcblx0XHRcdC5yZXBsYWNlKC9cXC8vZywgXCJfXCIpIC8vIFJlcGxhY2Ugc2xhc2hlcyB3aXRoIHVuZGVyc2NvcmVzXG5cdFx0XHQucmVwbGFjZSgvXFwuL2csIFwiX1wiKSAvLyBSZXBsYWNlIGRvdHMgd2l0aCB1bmRlcnNjb3Jlc1xuXHRcdFx0LnJlcGxhY2UoL19zZXJ2ZXJfKGpzfHRzKSQvLCBcIlwiKTsgLy8gUmVtb3ZlIC5zZXJ2ZXIuanMgb3IgLnNlcnZlci50cyBleHRlbnNpb25cblx0fSxcblxuXHQvKipcblx0ICogQ2xlYW4gcm91dGUgdHJhbnNmb3JtZXIgLSBjcmVhdGVzIGhpZXJhcmNoaWNhbCBwYXRoczogL2FwaS9hY3Rpb25zL3RvZG8vY3JlYXRlXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFJlbGF0aXZlIGZpbGUgcGF0aCAoZS5nLiwgXCJzcmMvYWN0aW9ucy90b2RvLnNlcnZlci5qc1wiKVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZnVuY3Rpb25OYW1lIC0gRnVuY3Rpb24gbmFtZSAoZS5nLiwgXCJjcmVhdGVcIilcblx0ICogQHJldHVybnMge3N0cmluZ30gLSBDbGVhbiByb3V0ZSAoZS5nLiwgXCJhY3Rpb25zL3RvZG8vY3JlYXRlXCIpXG5cdCAqL1xuXHRjcmVhdGVDbGVhblJvdXRlOiAoZmlsZVBhdGgsIGZ1bmN0aW9uTmFtZSkgPT4ge1xuXHRcdGNvbnN0IGNsZWFuUGF0aCA9IGZpbGVQYXRoXG5cdFx0XHQucmVwbGFjZSgvXnNyY1xcLy8sIFwiXCIpIC8vIFJlbW92ZSBzcmMvIHByZWZpeFxuXHRcdFx0LnJlcGxhY2UoL1xcLnNlcnZlclxcLihqc3x0cykkLywgXCJcIik7IC8vIFJlbW92ZSAuc2VydmVyLmpzIG9yIC5zZXJ2ZXIudHMgc3VmZml4XG5cdFx0cmV0dXJuIGAke2NsZWFuUGF0aH0vJHtmdW5jdGlvbk5hbWV9YDtcblx0fSxcblxuXHQvKipcblx0ICogTGVnYWN5IHJvdXRlIHRyYW5zZm9ybWVyIC0gY3JlYXRlcyB1bmRlcnNjb3JlLXNlcGFyYXRlZCBwYXRoczogL2FwaS9zcmNfYWN0aW9uc190b2RvL2NyZWF0ZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBSZWxhdGl2ZSBmaWxlIHBhdGggKGUuZy4sIFwic3JjL2FjdGlvbnMvdG9kby5zZXJ2ZXIuanNcIilcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAtIEZ1bmN0aW9uIG5hbWUgKGUuZy4sIFwiY3JlYXRlXCIpXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9IC0gTGVnYWN5IHJvdXRlIChlLmcuLCBcInNyY19hY3Rpb25zX3RvZG8vY3JlYXRlXCIpXG5cdCAqL1xuXHRjcmVhdGVMZWdhY3lSb3V0ZTogKGZpbGVQYXRoLCBmdW5jdGlvbk5hbWUpID0+IHtcblx0XHRjb25zdCBsZWdhY3lQYXRoID0gZmlsZVBhdGhcblx0XHRcdC5yZXBsYWNlKC9cXC8vZywgXCJfXCIpIC8vIFJlcGxhY2Ugc2xhc2hlcyB3aXRoIHVuZGVyc2NvcmVzXG5cdFx0XHQucmVwbGFjZSgvXFwuc2VydmVyXFwuKGpzfHRzKSQvLCBcIlwiKTsgLy8gUmVtb3ZlIC5zZXJ2ZXIuanMgb3IgLnNlcnZlci50cyBleHRlbnNpb25cblx0XHRyZXR1cm4gYCR7bGVnYWN5UGF0aH0vJHtmdW5jdGlvbk5hbWV9YDtcblx0fSxcblxuXHQvKipcblx0ICogTWluaW1hbCByb3V0ZSB0cmFuc2Zvcm1lciAtIGtlZXBzIG9yaWdpbmFsIHN0cnVjdHVyZTogL2FwaS9hY3Rpb25zL3RvZG8uc2VydmVyL2NyZWF0ZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBSZWxhdGl2ZSBmaWxlIHBhdGggKGUuZy4sIFwiYWN0aW9ucy90b2RvLnNlcnZlci5qc1wiKVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZnVuY3Rpb25OYW1lIC0gRnVuY3Rpb24gbmFtZSAoZS5nLiwgXCJjcmVhdGVcIilcblx0ICogQHJldHVybnMge3N0cmluZ30gLSBNaW5pbWFsIHJvdXRlIChlLmcuLCBcImFjdGlvbnMvdG9kby5zZXJ2ZXIvY3JlYXRlXCIpXG5cdCAqL1xuXHRjcmVhdGVNaW5pbWFsUm91dGU6IChmaWxlUGF0aCwgZnVuY3Rpb25OYW1lKSA9PiB7XG5cdFx0Y29uc3QgbWluaW1hbFBhdGggPSBmaWxlUGF0aC5yZXBsYWNlKC9cXC4oanN8dHMpJC8sIFwiXCIpOyAvLyBKdXN0IHJlbW92ZSAuanMgb3IgLnRzXG5cdFx0cmV0dXJuIGAke21pbmltYWxQYXRofS8ke2Z1bmN0aW9uTmFtZX1gO1xuXHR9LFxufTtcblxuY29uc3QgREVGQVVMVF9PUFRJT05TID0ge1xuXHRhcGlQcmVmaXg6IFwiL2FwaVwiLFxuXHRpbmNsdWRlOiBbXCIqKi8qLnNlcnZlci5qc1wiLCBcIioqLyouc2VydmVyLnRzXCJdLFxuXHRleGNsdWRlOiBbXSxcblx0bWlkZGxld2FyZTogW10sXG5cdG1vZHVsZU5hbWVUcmFuc2Zvcm06IHBhdGhVdGlscy5jcmVhdGVNb2R1bGVOYW1lLFxuXHRyb3V0ZVRyYW5zZm9ybTogKGZpbGVQYXRoLCBmdW5jdGlvbk5hbWUpID0+IHtcblx0XHQvLyBEZWZhdWx0IHRvIGNsZWFuIGhpZXJhcmNoaWNhbCBwYXRoczogL2FwaS9hY3Rpb25zL3RvZG8vY3JlYXRlXG5cdFx0Y29uc3QgY2xlYW5QYXRoID0gZmlsZVBhdGhcblx0XHRcdC5yZXBsYWNlKC9ec3JjXFwvLywgXCJcIikgLy8gUmVtb3ZlIHNyYy8gcHJlZml4XG5cdFx0XHQucmVwbGFjZSgvXFwuc2VydmVyXFwuKGpzfHRzKSQvLCBcIlwiKTsgLy8gUmVtb3ZlIC5zZXJ2ZXIuanMgb3IgLnNlcnZlci50cyBzdWZmaXhcblx0XHRyZXR1cm4gYCR7Y2xlYW5QYXRofS8ke2Z1bmN0aW9uTmFtZX1gO1xuXHR9LFxuXHR2YWxpZGF0aW9uOiB7XG5cdFx0ZW5hYmxlZDogZmFsc2UsXG5cdFx0YWRhcHRlcjogXCJ6b2RcIixcblx0fSxcbn07XG5cbmZ1bmN0aW9uIHNob3VsZFByb2Nlc3NGaWxlKGZpbGVQYXRoLCBvcHRpb25zKSB7XG5cdC8vIE5vcm1hbGl6ZSB0aGUgb3B0aW9ucyB0byBhcnJheXNcblx0Y29uc3QgaW5jbHVkZVBhdHRlcm5zID0gQXJyYXkuaXNBcnJheShvcHRpb25zLmluY2x1ZGUpID8gb3B0aW9ucy5pbmNsdWRlIDogW29wdGlvbnMuaW5jbHVkZV07XG5cdGNvbnN0IGV4Y2x1ZGVQYXR0ZXJucyA9IEFycmF5LmlzQXJyYXkob3B0aW9ucy5leGNsdWRlKSA/IG9wdGlvbnMuZXhjbHVkZSA6IFtvcHRpb25zLmV4Y2x1ZGVdO1xuXG5cdC8vIENoZWNrIGlmIGZpbGUgbWF0Y2hlcyBhbnkgaW5jbHVkZSBwYXR0ZXJuXG5cdGNvbnN0IGlzSW5jbHVkZWQgPSBpbmNsdWRlUGF0dGVybnMuc29tZSgocGF0dGVybikgPT4gbWluaW1hdGNoKGZpbGVQYXRoLCBwYXR0ZXJuKSk7XG5cblx0Ly8gQ2hlY2sgaWYgZmlsZSBtYXRjaGVzIGFueSBleGNsdWRlIHBhdHRlcm5cblx0Y29uc3QgaXNFeGNsdWRlZCA9IGV4Y2x1ZGVQYXR0ZXJucy5sZW5ndGggPiAwICYmIGV4Y2x1ZGVQYXR0ZXJucy5zb21lKChwYXR0ZXJuKSA9PiBtaW5pbWF0Y2goZmlsZVBhdGgsIHBhdHRlcm4pKTtcblxuXHRyZXR1cm4gaXNJbmNsdWRlZCAmJiAhaXNFeGNsdWRlZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc2VydmVyQWN0aW9ucyh1c2VyT3B0aW9ucyA9IHt9KSB7XG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0Li4uREVGQVVMVF9PUFRJT05TLFxuXHRcdC4uLnVzZXJPcHRpb25zLFxuXHRcdHZhbGlkYXRpb246IHsgLi4uREVGQVVMVF9PUFRJT05TLnZhbGlkYXRpb24sIC4uLnVzZXJPcHRpb25zLnZhbGlkYXRpb24gfSxcblx0XHRvcGVuQVBJOiB7XG5cdFx0XHRlbmFibGVkOiBmYWxzZSxcblx0XHRcdGluZm86IHtcblx0XHRcdFx0dGl0bGU6IFwiU2VydmVyIEFjdGlvbnMgQVBJXCIsXG5cdFx0XHRcdHZlcnNpb246IFwiMS4wLjBcIixcblx0XHRcdFx0ZGVzY3JpcHRpb246IFwiQXV0by1nZW5lcmF0ZWQgQVBJIGRvY3VtZW50YXRpb24gZm9yIFZpdGUgU2VydmVyIEFjdGlvbnNcIixcblx0XHRcdH0sXG5cdFx0XHRkb2NzUGF0aDogXCIvYXBpL2RvY3NcIixcblx0XHRcdHNwZWNQYXRoOiBcIi9hcGkvb3BlbmFwaS5qc29uXCIsXG5cdFx0XHRzd2FnZ2VyVUk6IHRydWUsXG5cdFx0XHQuLi51c2VyT3B0aW9ucy5vcGVuQVBJLFxuXHRcdH0sXG5cdH07XG5cblx0Y29uc3Qgc2VydmVyRnVuY3Rpb25zID0gbmV3IE1hcCgpO1xuXHRjb25zdCBzY2hlbWFEaXNjb3ZlcnkgPSBkZWZhdWx0U2NoZW1hRGlzY292ZXJ5O1xuXHRsZXQgYXBwO1xuXHRsZXQgb3BlbkFQSUdlbmVyYXRvcjtcblx0bGV0IHZhbGlkYXRpb25NaWRkbGV3YXJlID0gbnVsbDtcblx0bGV0IHZpdGVDb25maWcgPSBudWxsO1xuXG5cdC8vIEluaXRpYWxpemUgT3BlbkFQSSBnZW5lcmF0b3IgaWYgZW5hYmxlZFxuXHRpZiAob3B0aW9ucy5vcGVuQVBJLmVuYWJsZWQpIHtcblx0XHRvcGVuQVBJR2VuZXJhdG9yID0gbmV3IE9wZW5BUElHZW5lcmF0b3Ioe1xuXHRcdFx0aW5mbzogb3B0aW9ucy5vcGVuQVBJLmluZm8sXG5cdFx0fSk7XG5cdH1cblxuXHQvLyBJbml0aWFsaXplIHZhbGlkYXRpb24gbWlkZGxld2FyZSBpZiBlbmFibGVkXG5cdGlmIChvcHRpb25zLnZhbGlkYXRpb24uZW5hYmxlZCkge1xuXHRcdHZhbGlkYXRpb25NaWRkbGV3YXJlID0gY3JlYXRlVmFsaWRhdGlvbk1pZGRsZXdhcmUoe1xuXHRcdFx0c2NoZW1hRGlzY292ZXJ5LFxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRuYW1lOiBcInZpdGUtcGx1Z2luLXNlcnZlci1hY3Rpb25zXCIsXG5cblx0XHRjb25maWdSZXNvbHZlZChjb25maWcpIHtcblx0XHRcdC8vIFN0b3JlIFZpdGUgY29uZmlnIGZvciBsYXRlciB1c2Vcblx0XHRcdHZpdGVDb25maWcgPSBjb25maWc7XG5cdFx0fSxcblxuXHRcdGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcblx0XHRcdGFwcCA9IGV4cHJlc3MoKTtcblx0XHRcdGFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xuXG5cdFx0XHQvLyBDbGVhbiB1cCBvbiBITVJcblx0XHRcdGlmIChzZXJ2ZXIud2F0Y2hlcikge1xuXHRcdFx0XHRzZXJ2ZXIud2F0Y2hlci5vbignY2hhbmdlJywgKGZpbGUpID0+IHtcblx0XHRcdFx0XHQvLyBJZiBhIHNlcnZlciBmaWxlIGNoYW5nZWQsIHJlbW92ZSBpdCBmcm9tIHRoZSBtYXBcblx0XHRcdFx0XHRpZiAoc2hvdWxkUHJvY2Vzc0ZpbGUoZmlsZSwgb3B0aW9ucykpIHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgW21vZHVsZU5hbWUsIG1vZHVsZUluZm9dIG9mIHNlcnZlckZ1bmN0aW9ucy5lbnRyaWVzKCkpIHtcblx0XHRcdFx0XHRcdFx0aWYgKG1vZHVsZUluZm8uaWQgPT09IGZpbGUpIHtcblx0XHRcdFx0XHRcdFx0XHRzZXJ2ZXJGdW5jdGlvbnMuZGVsZXRlKG1vZHVsZU5hbWUpO1xuXHRcdFx0XHRcdFx0XHRcdHNjaGVtYURpc2NvdmVyeS5jbGVhcigpOyAvLyBDbGVhciBhc3NvY2lhdGVkIHNjaGVtYXNcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgW0hNUl0gQ2xlYW5lZCB1cCBzZXJ2ZXIgbW9kdWxlOiAke21vZHVsZU5hbWV9YCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXR1cCBkeW5hbWljIE9wZW5BUEkgZW5kcG9pbnRzIGluIGRldmVsb3BtZW50XG5cdFx0XHRpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09IFwicHJvZHVjdGlvblwiICYmIG9wdGlvbnMub3BlbkFQSS5lbmFibGVkICYmIG9wZW5BUElHZW5lcmF0b3IpIHtcblx0XHRcdFx0Ly8gT3BlbkFQSSBzcGVjIGVuZHBvaW50IC0gZ2VuZXJhdGVzIHNwZWMgZHluYW1pY2FsbHkgZnJvbSBjdXJyZW50IHNlcnZlckZ1bmN0aW9uc1xuXHRcdFx0XHRhcHAuZ2V0KG9wdGlvbnMub3BlbkFQSS5zcGVjUGF0aCwgKHJlcSwgcmVzKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3Qgb3BlbkFQSVNwZWMgPSBvcGVuQVBJR2VuZXJhdG9yLmdlbmVyYXRlU3BlYyhzZXJ2ZXJGdW5jdGlvbnMsIHNjaGVtYURpc2NvdmVyeSwge1xuXHRcdFx0XHRcdFx0YXBpUHJlZml4OiBvcHRpb25zLmFwaVByZWZpeCxcblx0XHRcdFx0XHRcdHJvdXRlVHJhbnNmb3JtOiBvcHRpb25zLnJvdXRlVHJhbnNmb3JtLFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Ly8gQWRkIGEgbm90ZSBpZiBubyBmdW5jdGlvbnMgYXJlIGZvdW5kXG5cdFx0XHRcdFx0aWYgKHNlcnZlckZ1bmN0aW9ucy5zaXplID09PSAwKSB7XG5cdFx0XHRcdFx0XHRvcGVuQVBJU3BlYy5pbmZvLmRlc2NyaXB0aW9uID1cblx0XHRcdFx0XHRcdFx0KG9wZW5BUElTcGVjLmluZm8uZGVzY3JpcHRpb24gfHwgXCJcIikgK1xuXHRcdFx0XHRcdFx0XHRcIlxcblxcbk5vdGU6IE5vIHNlcnZlciBmdW5jdGlvbnMgZm91bmQgeWV0LiBUcnkgcmVmcmVzaGluZyBhZnRlciBhY2Nlc3NpbmcgeW91ciBhcHAgdG8gdHJpZ2dlciBtb2R1bGUgbG9hZGluZy5cIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXMuanNvbihvcGVuQVBJU3BlYyk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIFN3YWdnZXIgVUkgc2V0dXBcblx0XHRcdFx0aWYgKG9wdGlvbnMub3BlbkFQSS5zd2FnZ2VyVUkpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0Ly8gRHluYW1pYyBpbXBvcnQgc3dhZ2dlci11aS1leHByZXNzXG5cdFx0XHRcdFx0XHRpbXBvcnQoXCJzd2FnZ2VyLXVpLWV4cHJlc3NcIilcblx0XHRcdFx0XHRcdFx0LnRoZW4oKHsgZGVmYXVsdDogc3dhZ2dlclVpIH0pID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBkb2NzUGF0aCA9IG9wdGlvbnMub3BlbkFQSS5kb2NzUGF0aDtcblxuXHRcdFx0XHRcdFx0XHRcdGFwcC51c2UoXG5cdFx0XHRcdFx0XHRcdFx0XHRkb2NzUGF0aCxcblx0XHRcdFx0XHRcdFx0XHRcdHN3YWdnZXJVaS5zZXJ2ZSxcblx0XHRcdFx0XHRcdFx0XHRcdHN3YWdnZXJVaS5zZXR1cChudWxsLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN3YWdnZXJPcHRpb25zOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dXJsOiBvcHRpb25zLm9wZW5BUEkuc3BlY1BhdGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHR9KSxcblx0XHRcdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gV2FpdCBmb3Igc2VydmVyIHRvIHN0YXJ0IGFuZCBnZXQgdGhlIGFjdHVhbCBwb3J0LCB0aGVuIGxvZyBVUkxzXG5cdFx0XHRcdFx0XHRcdFx0c2VydmVyLmh0dHBTZXJ2ZXI/Lm9uKFwibGlzdGVuaW5nXCIsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGFkZHJlc3MgPSBzZXJ2ZXIuaHR0cFNlcnZlci5hZGRyZXNzKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBwb3J0ID0gYWRkcmVzcz8ucG9ydCB8fCA1MTczO1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWx3YXlzIHVzZSBsb2NhbGhvc3QgZm9yIGNvbnNpc3RlbnQgZGlzcGxheVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgaG9zdCA9IFwibG9jYWxob3N0XCI7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vIERlbGF5IHRvIGFwcGVhciBhZnRlciBWaXRlJ3Mgc3RhcnR1cCBtZXNzYWdlc1xuXHRcdFx0XHRcdFx0XHRcdFx0Z2xvYmFsLnNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAodml0ZUNvbmZpZz8ubG9nZ2VyKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYCAgXFx4MWJbMjszMm1cdTI3OUNcXHgxYlswbSAgQVBJIERvY3M6IGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0ke2RvY3NQYXRofWApO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGAgIFxceDFiWzI7MzJtXHUyNzlDXFx4MWJbMG0gIE9wZW5BUEk6ICBodHRwOi8vJHtob3N0fToke3BvcnR9JHtvcHRpb25zLm9wZW5BUEkuc3BlY1BhdGh9YCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYFx1RDgzRFx1RENENiBBUEkgRG9jdW1lbnRhdGlvbjogaHR0cDovLyR7aG9zdH06JHtwb3J0fSR7ZG9jc1BhdGh9YCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYFx1RDgzRFx1RENDNCBPcGVuQVBJIFNwZWM6IGh0dHA6Ly8ke2hvc3R9OiR7cG9ydH0ke29wdGlvbnMub3BlbkFQSS5zcGVjUGF0aH1gKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fSwgNTApOyAvLyBTbWFsbCBkZWxheSB0byBhcHBlYXIgYWZ0ZXIgVml0ZSdzIHJlYWR5IG1lc3NhZ2Vcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0LmNhdGNoKChlcnJvcikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIlN3YWdnZXIgVUkgc2V0dXAgZmFpbGVkOlwiLCBlcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcIlN3YWdnZXIgVUkgc2V0dXAgZmFpbGVkOlwiLCBlcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VydmVyLm1pZGRsZXdhcmVzLnVzZShhcHApO1xuXG5cdFx0XHQvLyBTaG93IGRldmVsb3BtZW50IGZlZWRiYWNrIGFmdGVyIHNlcnZlciBpcyByZWFkeVxuXHRcdFx0aWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnKSB7XG5cdFx0XHRcdHNlcnZlci5odHRwU2VydmVyPy5vbihcImxpc3RlbmluZ1wiLCAoKSA9PiB7XG5cdFx0XHRcdFx0Ly8gRGVsYXkgdG8gYXBwZWFyIGFmdGVyIFZpdGUncyBzdGFydHVwIG1lc3NhZ2VzXG5cdFx0XHRcdFx0Z2xvYmFsLnNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKHNlcnZlckZ1bmN0aW9ucy5zaXplID4gMCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhjcmVhdGVEZXZlbG9wbWVudEZlZWRiYWNrKHNlcnZlckZ1bmN0aW9ucykpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sIDEwMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRhc3luYyByZXNvbHZlSWQoc291cmNlLCBpbXBvcnRlcikge1xuXHRcdFx0aWYgKGltcG9ydGVyICYmIHNob3VsZFByb2Nlc3NGaWxlKHNvdXJjZSwgb3B0aW9ucykpIHtcblx0XHRcdFx0Y29uc3QgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShpbXBvcnRlciksIHNvdXJjZSk7XG5cdFx0XHRcdHJldHVybiByZXNvbHZlZFBhdGg7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGFzeW5jIGxvYWQoaWQpIHtcblx0XHRcdGlmIChzaG91bGRQcm9jZXNzRmlsZShpZCwgb3B0aW9ucykpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRjb25zdCBjb2RlID0gYXdhaXQgZnMucmVhZEZpbGUoaWQsIFwidXRmLThcIik7XG5cblx0XHRcdFx0XHQvLyBTYW5pdGl6ZSB0aGUgZmlsZSBwYXRoIGZvciBzZWN1cml0eVxuXHRcdFx0XHRcdGNvbnN0IHNhbml0aXplZFBhdGggPSBzYW5pdGl6ZVBhdGgoaWQsIHByb2Nlc3MuY3dkKCkpO1xuXHRcdFx0XHRcdGlmICghc2FuaXRpemVkUGF0aCkge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGZpbGUgcGF0aCBkZXRlY3RlZDogJHtpZH1gKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRsZXQgcmVsYXRpdmVQYXRoID0gcGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzYW5pdGl6ZWRQYXRoKTtcblxuXHRcdFx0XHRcdC8vIE5vcm1hbGl6ZSBwYXRoIHNlcGFyYXRvcnNcblx0XHRcdFx0XHRyZWxhdGl2ZVBhdGggPSByZWxhdGl2ZVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIikucmVwbGFjZSgvXlxcLy8sIFwiXCIpO1xuXG5cdFx0XHRcdFx0Ly8gR2VuZXJhdGUgbW9kdWxlIG5hbWUgZm9yIGludGVybmFsIHVzZSAobXVzdCBiZSB2YWxpZCBpZGVudGlmaWVyKVxuXHRcdFx0XHRcdGNvbnN0IG1vZHVsZU5hbWUgPSBjcmVhdGVTZWN1cmVNb2R1bGVOYW1lKG9wdGlvbnMubW9kdWxlTmFtZVRyYW5zZm9ybShyZWxhdGl2ZVBhdGgpKTtcblxuXHRcdFx0XHRcdC8vIFZhbGlkYXRlIG1vZHVsZSBuYW1lXG5cdFx0XHRcdFx0aWYgKCFpc1ZhbGlkTW9kdWxlTmFtZShtb2R1bGVOYW1lKSkge1xuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNlcnZlciBtb2R1bGUgbmFtZTogJHttb2R1bGVOYW1lfWApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFVzZSBBU1QgcGFyc2VyIHRvIGV4dHJhY3QgZXhwb3J0ZWQgZnVuY3Rpb25zIHdpdGggZGV0YWlsZWQgaW5mb3JtYXRpb25cblx0XHRcdFx0XHRjb25zdCBleHBvcnRlZEZ1bmN0aW9ucyA9IGV4dHJhY3RFeHBvcnRlZEZ1bmN0aW9ucyhjb2RlLCBpZCk7XG5cdFx0XHRcdFx0Y29uc3QgZnVuY3Rpb25zID0gW107XG5cdFx0XHRcdFx0Y29uc3QgZnVuY3Rpb25EZXRhaWxzID0gW107XG5cblx0XHRcdFx0XHRmb3IgKGNvbnN0IGZuIG9mIGV4cG9ydGVkRnVuY3Rpb25zKSB7XG5cdFx0XHRcdFx0XHQvLyBTa2lwIGRlZmF1bHQgZXhwb3J0cyBmb3Igbm93IChjb3VsZCBiZSBzdXBwb3J0ZWQgaW4gZnV0dXJlKVxuXHRcdFx0XHRcdFx0aWYgKGZuLmlzRGVmYXVsdCkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oY3JlYXRlRGV2ZWxvcG1lbnRXYXJuaW5nKFxuXHRcdFx0XHRcdFx0XHRcdFwiRGVmYXVsdCBFeHBvcnQgU2tpcHBlZFwiLFxuXHRcdFx0XHRcdFx0XHRcdGBEZWZhdWx0IGV4cG9ydHMgYXJlIG5vdCBjdXJyZW50bHkgc3VwcG9ydGVkYCxcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aDogcmVsYXRpdmVQYXRoLFxuXHRcdFx0XHRcdFx0XHRcdFx0c3VnZ2VzdGlvbjogXCJVc2UgbmFtZWQgZXhwb3J0cyBpbnN0ZWFkOiBleHBvcnQgYXN5bmMgZnVuY3Rpb24gbXlGdW5jdGlvbigpIHt9XCJcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCkpO1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gVmFsaWRhdGUgZnVuY3Rpb24gbmFtZVxuXHRcdFx0XHRcdFx0aWYgKCFpc1ZhbGlkRnVuY3Rpb25OYW1lKGZuLm5hbWUpKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcoXG5cdFx0XHRcdFx0XHRcdFx0XCJJbnZhbGlkIEZ1bmN0aW9uIE5hbWVcIixcblx0XHRcdFx0XHRcdFx0XHRgRnVuY3Rpb24gbmFtZSAnJHtmbi5uYW1lfScgaXMgbm90IGEgdmFsaWQgSmF2YVNjcmlwdCBpZGVudGlmaWVyYCxcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaWxlUGF0aDogcmVsYXRpdmVQYXRoLFxuXHRcdFx0XHRcdFx0XHRcdFx0c3VnZ2VzdGlvbjogXCJGdW5jdGlvbiBuYW1lcyBtdXN0IHN0YXJ0IHdpdGggYSBsZXR0ZXIsICQsIG9yIF8gYW5kIGNvbnRhaW4gb25seSBsZXR0ZXJzLCBudW1iZXJzLCAkLCBhbmQgX1wiXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQpKTtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIFdhcm4gYWJvdXQgbm9uLWFzeW5jIGZ1bmN0aW9uc1xuXHRcdFx0XHRcdFx0aWYgKCFmbi5pc0FzeW5jKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcoXG5cdFx0XHRcdFx0XHRcdFx0XCJOb24tQXN5bmMgRnVuY3Rpb25cIixcblx0XHRcdFx0XHRcdFx0XHRgRnVuY3Rpb24gJyR7Zm4ubmFtZX0nIGlzIG5vdCBhc3luYy4gU2VydmVyIGFjdGlvbnMgc2hvdWxkIHR5cGljYWxseSBiZSBhc3luY2AsXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg6IHJlbGF0aXZlUGF0aCxcblx0XHRcdFx0XHRcdFx0XHRcdHN1Z2dlc3Rpb246IFwiQ29uc2lkZXIgY2hhbmdpbmcgdG86IGV4cG9ydCBhc3luYyBmdW5jdGlvbiBcIiArIGZuLm5hbWUgKyBcIigpIHt9XCJcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCkpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRmdW5jdGlvbnMucHVzaChmbi5uYW1lKTtcblx0XHRcdFx0XHRcdGZ1bmN0aW9uRGV0YWlscy5wdXNoKGZuKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBDaGVjayBmb3IgZHVwbGljYXRlIGZ1bmN0aW9uIG5hbWVzIHdpdGhpbiB0aGUgc2FtZSBtb2R1bGVcblx0XHRcdFx0XHRjb25zdCB1bmlxdWVGdW5jdGlvbnMgPSBbLi4ubmV3IFNldChmdW5jdGlvbnMpXTtcblx0XHRcdFx0XHRpZiAodW5pcXVlRnVuY3Rpb25zLmxlbmd0aCAhPT0gZnVuY3Rpb25zLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKGBEdXBsaWNhdGUgZnVuY3Rpb24gbmFtZXMgZGV0ZWN0ZWQgaW4gJHtpZH1gKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTdG9yZSBib3RoIHNpbXBsZSBmdW5jdGlvbiBuYW1lcyBhbmQgZGV0YWlsZWQgaW5mb3JtYXRpb25cblx0XHRcdFx0XHRzZXJ2ZXJGdW5jdGlvbnMuc2V0KG1vZHVsZU5hbWUsIHsgXG5cdFx0XHRcdFx0XHRmdW5jdGlvbnM6IHVuaXF1ZUZ1bmN0aW9ucywgXG5cdFx0XHRcdFx0XHRmdW5jdGlvbkRldGFpbHMsIFxuXHRcdFx0XHRcdFx0aWQsIFxuXHRcdFx0XHRcdFx0ZmlsZVBhdGg6IHJlbGF0aXZlUGF0aCBcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vIERldmVsb3BtZW50LXRpbWUgdmFsaWRhdGlvbiBhbmQgZmVlZGJhY2tcblx0XHRcdFx0XHRpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcblx0XHRcdFx0XHRcdC8vIFZhbGlkYXRlIGZpbGUgc3RydWN0dXJlXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlV2FybmluZ3MgPSB2YWxpZGF0ZUZpbGVTdHJ1Y3R1cmUoZnVuY3Rpb25EZXRhaWxzLCByZWxhdGl2ZVBhdGgpO1xuXHRcdFx0XHRcdFx0ZmlsZVdhcm5pbmdzLmZvckVhY2god2FybmluZyA9PiBjb25zb2xlLndhcm4od2FybmluZykpO1xuXG5cdFx0XHRcdFx0XHQvLyBWYWxpZGF0ZSBpbmRpdmlkdWFsIGZ1bmN0aW9uIHNpZ25hdHVyZXNcblx0XHRcdFx0XHRcdGZ1bmN0aW9uRGV0YWlscy5mb3JFYWNoKGZ1bmMgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBmdW5jV2FybmluZ3MgPSB2YWxpZGF0ZUZ1bmN0aW9uU2lnbmF0dXJlKGZ1bmMsIHJlbGF0aXZlUGF0aCk7XG5cdFx0XHRcdFx0XHRcdGZ1bmNXYXJuaW5ncy5mb3JFYWNoKHdhcm5pbmcgPT4gY29uc29sZS53YXJuKHdhcm5pbmcpKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIERpc2NvdmVyIHNjaGVtYXMgZnJvbSBtb2R1bGUgaWYgdmFsaWRhdGlvbiBpcyBlbmFibGVkIChkZXZlbG9wbWVudCBvbmx5KVxuXHRcdFx0XHRcdGlmIChvcHRpb25zLnZhbGlkYXRpb24uZW5hYmxlZCAmJiBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gXCJwcm9kdWN0aW9uXCIpIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1vZHVsZSA9IGF3YWl0IGltcG9ydChpZCk7XG5cdFx0XHRcdFx0XHRcdHNjaGVtYURpc2NvdmVyeS5kaXNjb3ZlckZyb21Nb2R1bGUobW9kdWxlLCBtb2R1bGVOYW1lKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdC8vIFZhbGlkYXRlIHNjaGVtYSBhdHRhY2htZW50IGluIGRldmVsb3BtZW50XG5cdFx0XHRcdFx0XHRcdGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHNjaGVtYVdhcm5pbmdzID0gdmFsaWRhdGVTY2hlbWFBdHRhY2htZW50KG1vZHVsZSwgdW5pcXVlRnVuY3Rpb25zLCByZWxhdGl2ZVBhdGgpO1xuXHRcdFx0XHRcdFx0XHRcdHNjaGVtYVdhcm5pbmdzLmZvckVhY2god2FybmluZyA9PiBjb25zb2xlLndhcm4od2FybmluZykpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBlbmhhbmNlZEVycm9yID0gZW5oYW5jZU1vZHVsZUxvYWRFcnJvcihpZCwgZXJyb3IpO1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oZW5oYW5jZWRFcnJvci5tZXNzYWdlKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyAmJiBlbmhhbmNlZEVycm9yLnN1Z2dlc3Rpb25zKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZW5oYW5jZWRFcnJvci5zdWdnZXN0aW9ucy5mb3JFYWNoKHN1Z2dlc3Rpb24gPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5pbmZvKGAgIFx1RDgzRFx1RENBMSAke3N1Z2dlc3Rpb259YCk7XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTZXR1cCByb3V0ZXMgaW4gZGV2ZWxvcG1lbnQgbW9kZSBvbmx5XG5cdFx0XHRcdFx0aWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSBcInByb2R1Y3Rpb25cIiAmJiBhcHApIHtcblx0XHRcdFx0XHRcdC8vIE5vcm1hbGl6ZSBtaWRkbGV3YXJlIHRvIGFycmF5IChjcmVhdGUgYSBmcmVzaCBjb3B5IHRvIGF2b2lkIG11dGF0aW9uKVxuXHRcdFx0XHRcdFx0Y29uc3QgbWlkZGxld2FyZXMgPSBBcnJheS5pc0FycmF5KG9wdGlvbnMubWlkZGxld2FyZSlcblx0XHRcdFx0XHRcdFx0PyBbLi4ub3B0aW9ucy5taWRkbGV3YXJlXSAvLyBDcmVhdGUgYSBjb3B5XG5cdFx0XHRcdFx0XHRcdDogb3B0aW9ucy5taWRkbGV3YXJlXG5cdFx0XHRcdFx0XHRcdFx0PyBbb3B0aW9ucy5taWRkbGV3YXJlXVxuXHRcdFx0XHRcdFx0XHRcdDogW107XG5cblx0XHRcdFx0XHRcdC8vIEFkZCB2YWxpZGF0aW9uIG1pZGRsZXdhcmUgaWYgZW5hYmxlZFxuXHRcdFx0XHRcdFx0aWYgKHZhbGlkYXRpb25NaWRkbGV3YXJlKSB7XG5cdFx0XHRcdFx0XHRcdG1pZGRsZXdhcmVzLnB1c2godmFsaWRhdGlvbk1pZGRsZXdhcmUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR1bmlxdWVGdW5jdGlvbnMuZm9yRWFjaCgoZnVuY3Rpb25OYW1lKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJvdXRlUGF0aCA9IG9wdGlvbnMucm91dGVUcmFuc2Zvcm0ocmVsYXRpdmVQYXRoLCBmdW5jdGlvbk5hbWUpO1xuXHRcdFx0XHRcdFx0XHRjb25zdCBlbmRwb2ludCA9IGAke29wdGlvbnMuYXBpUHJlZml4fS8ke3JvdXRlUGF0aH1gO1xuXG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIGNvbnRleHQtYXdhcmUgdmFsaWRhdGlvbiBtaWRkbGV3YXJlIGlmIHZhbGlkYXRpb24gaXMgZW5hYmxlZFxuXHRcdFx0XHRcdFx0XHRjb25zdCBjb250ZXh0TWlkZGxld2FyZXMgPSBbLi4ubWlkZGxld2FyZXNdO1xuXHRcdFx0XHRcdFx0XHRpZiAodmFsaWRhdGlvbk1pZGRsZXdhcmUgJiYgb3B0aW9ucy52YWxpZGF0aW9uLmVuYWJsZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBSZXBsYWNlIHRoZSBnZW5lcmljIHZhbGlkYXRpb24gbWlkZGxld2FyZSB3aXRoIGEgY29udGV4dC1hd2FyZSBvbmVcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBsYXN0SWR4ID0gY29udGV4dE1pZGRsZXdhcmVzLmxlbmd0aCAtIDE7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNvbnRleHRNaWRkbGV3YXJlc1tsYXN0SWR4XSA9PT0gdmFsaWRhdGlvbk1pZGRsZXdhcmUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnRleHRNaWRkbGV3YXJlc1tsYXN0SWR4XSA9IChyZXEsIHJlcywgbmV4dCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBBZGQgY29udGV4dCB0byByZXF1ZXN0IGZvciB2YWxpZGF0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEdldCB0aGUgc2NoZW1hIGRpcmVjdGx5IGZyb20gc2NoZW1hRGlzY292ZXJ5XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHNjaGVtYSA9IHNjaGVtYURpc2NvdmVyeS5nZXRTY2hlbWEobW9kdWxlTmFtZSwgZnVuY3Rpb25OYW1lKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVxLnZhbGlkYXRpb25Db250ZXh0ID0ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1vZHVsZU5hbWUsIC8vIEZvciBlcnJvciBtZXNzYWdlc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uTmFtZSwgLy8gRm9yIGVycm9yIG1lc3NhZ2VzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2NoZW1hLCAvLyBEaXJlY3Qgc2NoZW1hIGFjY2Vzc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdmFsaWRhdGlvbk1pZGRsZXdhcmUocmVxLCByZXMsIG5leHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBBcHBseSBtaWRkbGV3YXJlIGJlZm9yZSB0aGUgaGFuZGxlclxuXHRcdFx0XHRcdFx0XHRhcHAucG9zdChlbmRwb2ludCwgLi4uY29udGV4dE1pZGRsZXdhcmVzLCBhc3luYyAocmVxLCByZXMpID0+IHtcblx0XHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbW9kdWxlID0gYXdhaXQgaW1wb3J0KGlkKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgZnVuY3Rpb24gZXhpc3RzIGluIG1vZHVsZVxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBtb2R1bGVbZnVuY3Rpb25OYW1lXSAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEdldCBhdmFpbGFibGUgZnVuY3Rpb25zIGZvciBiZXR0ZXIgZXJyb3IgbWVzc2FnZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBhdmFpbGFibGVGdW5jdGlvbnMgPSBPYmplY3Qua2V5cyhtb2R1bGUpLmZpbHRlcihrZXkgPT4gXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZW9mIG1vZHVsZVtrZXldID09PSAnZnVuY3Rpb24nXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBlbmhhbmNlZEVycm9yID0gZW5oYW5jZUZ1bmN0aW9uTm90Rm91bmRFcnJvcihcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbk5hbWUsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1vZHVsZU5hbWUsIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGF2YWlsYWJsZUZ1bmN0aW9uc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGVuaGFuY2VkRXJyb3IubWVzc2FnZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vIFZhbGlkYXRlIHJlcXVlc3QgYm9keSBpcyBhcnJheSBmb3IgZnVuY3Rpb24gYXJndW1lbnRzXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkocmVxLmJvZHkpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlJlcXVlc3QgYm9keSBtdXN0IGJlIGFuIGFycmF5IG9mIGZ1bmN0aW9uIGFyZ3VtZW50c1wiKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgbW9kdWxlW2Z1bmN0aW9uTmFtZV0oLi4ucmVxLmJvZHkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzLmpzb24ocmVzdWx0IHx8IFwiKiBObyByZXNwb25zZSAqXCIpO1xuXHRcdFx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2Z1bmN0aW9uTmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoXCJub3QgZm91bmRcIikgfHwgZXJyb3IubWVzc2FnZS5pbmNsdWRlcyhcIm5vdCBhIGZ1bmN0aW9uXCIpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEV4dHJhY3QgYXZhaWxhYmxlIGZ1bmN0aW9ucyBmcm9tIHRoZSBlcnJvciBjb250ZXh0IGlmIGF2YWlsYWJsZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBhdmFpbGFibGVGdW5jdGlvbnNNYXRjaCA9IGVycm9yLm1lc3NhZ2UubWF0Y2goL0F2YWlsYWJsZSBmdW5jdGlvbnM6IChbXl0rKS8pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBhdmFpbGFibGVGdW5jdGlvbnMgPSBhdmFpbGFibGVGdW5jdGlvbnNNYXRjaCBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ/IGF2YWlsYWJsZUZ1bmN0aW9uc01hdGNoWzFdLnNwbGl0KCcsICcpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0OiBbXTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJlcy5zdGF0dXMoNDA0KS5qc29uKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0NDA0LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiRnVuY3Rpb24gbm90IGZvdW5kXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJGVU5DVElPTl9OT1RfRk9VTkRcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7IFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZnVuY3Rpb25OYW1lLCBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhdmFpbGFibGVGdW5jdGlvbnM6IGF2YWlsYWJsZUZ1bmN0aW9ucy5sZW5ndGggPiAwID8gYXZhaWxhYmxlRnVuY3Rpb25zIDogdW5kZWZpbmVkLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3VnZ2VzdGlvbjogYFRyeSBvbmUgb2Y6ICR7YXZhaWxhYmxlRnVuY3Rpb25zLmpvaW4oJywgJykgfHwgJ25vbmUgYXZhaWxhYmxlJ31gXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcyhcIlJlcXVlc3QgYm9keVwiKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXMuc3RhdHVzKDQwMCkuanNvbihjcmVhdGVFcnJvclJlc3BvbnNlKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDQwMCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlcnJvci5tZXNzYWdlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFwiSU5WQUxJRF9SRVFVRVNUX0JPRFlcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR7IFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3VnZ2VzdGlvbjogXCJTZW5kIGFuIGFycmF5IG9mIGFyZ3VtZW50czogW2FyZzEsIGFyZzIsIC4uLl1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVzLnN0YXR1cyg1MDApLmpzb24oY3JlYXRlRXJyb3JSZXNwb25zZShcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ1MDAsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIixcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcIklOVEVSTkFMX0VSUk9SXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdD8geyBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bWVzc2FnZTogZXJyb3IubWVzc2FnZSwgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0YWNrOiBlcnJvci5zdGFjayxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3VnZ2VzdGlvbjogXCJDaGVjayBzZXJ2ZXIgbG9ncyBmb3IgbW9yZSBkZXRhaWxzXCJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0gXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQ6IHsgc3VnZ2VzdGlvbjogXCJDb250YWN0IHN1cHBvcnQgaWYgdGhpcyBwZXJzaXN0c1wiIH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0KSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBPcGVuQVBJIGVuZHBvaW50cyB3aWxsIGJlIHNldCB1cCBkdXJpbmcgY29uZmlndXJlU2VydmVyIGFmdGVyIGFsbCBtb2R1bGVzIGFyZSBsb2FkZWRcblxuXHRcdFx0XHRcdC8vIFVzZSBlbmhhbmNlZCBjbGllbnQgcHJveHkgZ2VuZXJhdG9yIGlmIHdlIGhhdmUgZGV0YWlsZWQgZnVuY3Rpb24gaW5mb3JtYXRpb25cblx0XHRcdFx0XHRpZiAoZnVuY3Rpb25EZXRhaWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdHJldHVybiBnZW5lcmF0ZUVuaGFuY2VkQ2xpZW50UHJveHkobW9kdWxlTmFtZSwgZnVuY3Rpb25EZXRhaWxzLCBvcHRpb25zLCByZWxhdGl2ZVBhdGgpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBGYWxsYmFjayB0byBiYXNpYyBwcm94eSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcblx0XHRcdFx0XHRcdHJldHVybiBnZW5lcmF0ZUNsaWVudFByb3h5KG1vZHVsZU5hbWUsIHVuaXF1ZUZ1bmN0aW9ucywgb3B0aW9ucywgcmVsYXRpdmVQYXRoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0Y29uc3QgZW5oYW5jZWRFcnJvciA9IGVuaGFuY2VQYXJzaW5nRXJyb3IoaWQsIGVycm9yKTtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGVuaGFuY2VkRXJyb3IubWVzc2FnZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gUHJvdmlkZSBoZWxwZnVsIHN1Z2dlc3Rpb25zIGluIGRldmVsb3BtZW50XG5cdFx0XHRcdFx0aWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnICYmIGVuaGFuY2VkRXJyb3Iuc3VnZ2VzdGlvbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5pbmZvKCdbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gXHVEODNEXHVEQ0ExIFN1Z2dlc3Rpb25zOicpO1xuXHRcdFx0XHRcdFx0ZW5oYW5jZWRFcnJvci5zdWdnZXN0aW9ucy5mb3JFYWNoKHN1Z2dlc3Rpb24gPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmluZm8oYCAgXHUyMDIyICR7c3VnZ2VzdGlvbn1gKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBSZXR1cm4gZXJyb3IgY29tbWVudCB3aXRoIGNvbnRleHQgaW5zdGVhZCBvZiBmYWlsaW5nIHRoZSBidWlsZFxuXHRcdFx0XHRcdHJldHVybiBgLy8gRmFpbGVkIHRvIGxvYWQgc2VydmVyIGFjdGlvbnMgZnJvbSAke2lkfVxuLy8gRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1cbi8vICR7ZW5oYW5jZWRFcnJvci5zdWdnZXN0aW9ucy5sZW5ndGggPiAwID8gJ1N1Z2dlc3Rpb25zOiAnICsgZW5oYW5jZWRFcnJvci5zdWdnZXN0aW9ucy5qb2luKCcsICcpIDogJyd9YDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0cmFuc2Zvcm0oY29kZSwgaWQpIHtcblx0XHRcdC8vIFRoaXMgaG9vayBpcyBub3QgbmVlZGVkIHNpbmNlIHdlIGhhbmRsZSB0aGUgdHJhbnNmb3JtYXRpb24gaW4gdGhlIGxvYWQgaG9va1xuXHRcdFx0Ly8gVGhlIHdhcm5pbmcgd2FzIGluY29ycmVjdGx5IGZsYWdnaW5nIGxlZ2l0aW1hdGUgaW1wb3J0cyB0aGF0IGFyZSBiZWluZyB0cmFuc2Zvcm1lZFxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSxcblxuXHRcdGFzeW5jIGdlbmVyYXRlQnVuZGxlKG91dHB1dE9wdGlvbnMsIGJ1bmRsZSkge1xuXHRcdFx0Ly8gQ3JlYXRlIGEgdmlydHVhbCBlbnRyeSBwb2ludCBmb3IgYWxsIHNlcnZlciBmdW5jdGlvbnNcblx0XHRcdGNvbnN0IHZpcnR1YWxFbnRyeUlkID0gXCJ2aXJ0dWFsOnNlcnZlci1hY3Rpb25zLWVudHJ5XCI7XG5cdFx0XHRsZXQgdmlydHVhbE1vZHVsZUNvbnRlbnQgPSBcIlwiO1xuXHRcdFx0Zm9yIChjb25zdCBbbW9kdWxlTmFtZSwgeyBpZCB9XSBvZiBzZXJ2ZXJGdW5jdGlvbnMpIHtcblx0XHRcdFx0dmlydHVhbE1vZHVsZUNvbnRlbnQgKz0gYGltcG9ydCAqIGFzICR7bW9kdWxlTmFtZX0gZnJvbSAnJHtpZH0nO1xcbmA7XG5cdFx0XHR9XG5cdFx0XHR2aXJ0dWFsTW9kdWxlQ29udGVudCArPSBgZXhwb3J0IHsgJHtBcnJheS5mcm9tKHNlcnZlckZ1bmN0aW9ucy5rZXlzKCkpLmpvaW4oXCIsIFwiKX0gfTtgO1xuXG5cdFx0XHQvLyBVc2UgUm9sbHVwIHRvIGJ1bmRsZSB0aGUgdmlydHVhbCBtb2R1bGVcblx0XHRcdGNvbnN0IGJ1aWxkID0gYXdhaXQgcm9sbHVwKHtcblx0XHRcdFx0aW5wdXQ6IHZpcnR1YWxFbnRyeUlkLFxuXHRcdFx0XHRwbHVnaW5zOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bmFtZTogXCJ2aXJ0dWFsXCIsXG5cdFx0XHRcdFx0XHRyZXNvbHZlSWQoaWQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGlkID09PSB2aXJ0dWFsRW50cnlJZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBpZDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGxvYWQoaWQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGlkID09PSB2aXJ0dWFsRW50cnlJZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB2aXJ0dWFsTW9kdWxlQ29udGVudDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG5hbWU6IFwiZXh0ZXJuYWwtbW9kdWxlc1wiLFxuXHRcdFx0XHRcdFx0cmVzb2x2ZUlkKHNvdXJjZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXNob3VsZFByb2Nlc3NGaWxlKHNvdXJjZSwgb3B0aW9ucykgJiYgIXNvdXJjZS5zdGFydHNXaXRoKFwiLlwiKSAmJiAhcGF0aC5pc0Fic29sdXRlKHNvdXJjZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4geyBpZDogc291cmNlLCBleHRlcm5hbDogdHJ1ZSB9O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdF0sXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgeyBvdXRwdXQgfSA9IGF3YWl0IGJ1aWxkLmdlbmVyYXRlKHsgZm9ybWF0OiBcImVzXCIgfSk7XG5cblx0XHRcdGlmIChvdXRwdXQubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBidW5kbGUgc2VydmVyIGZ1bmN0aW9uc1wiKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgYnVuZGxlZENvZGUgPSBvdXRwdXRbMF0uY29kZTtcblxuXHRcdFx0Ly8gRW1pdCB0aGUgYnVuZGxlZCBzZXJ2ZXIgZnVuY3Rpb25zXG5cdFx0XHR0aGlzLmVtaXRGaWxlKHtcblx0XHRcdFx0dHlwZTogXCJhc3NldFwiLFxuXHRcdFx0XHRmaWxlTmFtZTogXCJhY3Rpb25zLmpzXCIsXG5cdFx0XHRcdHNvdXJjZTogYnVuZGxlZENvZGUsXG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gR2VuZXJhdGUgYW5kIGVtaXQgVHlwZVNjcmlwdCBkZWZpbml0aW9uc1xuXHRcdFx0Y29uc3QgdHlwZURlZmluaXRpb25zID0gZ2VuZXJhdGVUeXBlRGVmaW5pdGlvbnMoc2VydmVyRnVuY3Rpb25zLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuZW1pdEZpbGUoe1xuXHRcdFx0XHR0eXBlOiBcImFzc2V0XCIsXG5cdFx0XHRcdGZpbGVOYW1lOiBcImFjdGlvbnMuZC50c1wiLFxuXHRcdFx0XHRzb3VyY2U6IHR5cGVEZWZpbml0aW9ucyxcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBHZW5lcmF0ZSBPcGVuQVBJIHNwZWMgaWYgZW5hYmxlZFxuXHRcdFx0bGV0IG9wZW5BUElTcGVjID0gbnVsbDtcblx0XHRcdGlmIChvcHRpb25zLm9wZW5BUEkuZW5hYmxlZCkge1xuXHRcdFx0XHRvcGVuQVBJU3BlYyA9IG9wZW5BUElHZW5lcmF0b3IuZ2VuZXJhdGVTcGVjKHNlcnZlckZ1bmN0aW9ucywgc2NoZW1hRGlzY292ZXJ5LCB7XG5cdFx0XHRcdFx0YXBpUHJlZml4OiBvcHRpb25zLmFwaVByZWZpeCxcblx0XHRcdFx0XHRyb3V0ZVRyYW5zZm9ybTogb3B0aW9ucy5yb3V0ZVRyYW5zZm9ybSxcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gRW1pdCBPcGVuQVBJIHNwZWMgYXMgYSBzZXBhcmF0ZSBmaWxlXG5cdFx0XHRcdHRoaXMuZW1pdEZpbGUoe1xuXHRcdFx0XHRcdHR5cGU6IFwiYXNzZXRcIixcblx0XHRcdFx0XHRmaWxlTmFtZTogXCJvcGVuYXBpLmpzb25cIixcblx0XHRcdFx0XHRzb3VyY2U6IEpTT04uc3RyaW5naWZ5KG9wZW5BUElTcGVjLCBudWxsLCAyKSxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEdlbmVyYXRlIHZhbGlkYXRpb24gY29kZSBpZiBlbmFibGVkXG5cdFx0XHRjb25zdCB2YWxpZGF0aW9uQ29kZSA9IGF3YWl0IGdlbmVyYXRlVmFsaWRhdGlvbkNvZGUob3B0aW9ucywgc2VydmVyRnVuY3Rpb25zKTtcblxuXHRcdFx0Ly8gR2VuZXJhdGUgc2VydmVyLmpzXG5cdFx0XHRjb25zdCBzZXJ2ZXJDb2RlID0gYFxuICAgICAgICBpbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbiAgICAgICAgaW1wb3J0ICogYXMgc2VydmVyQWN0aW9ucyBmcm9tICcuL2FjdGlvbnMuanMnO1xuICAgICAgICAke29wdGlvbnMub3BlbkFQSS5lbmFibGVkICYmIG9wdGlvbnMub3BlbkFQSS5zd2FnZ2VyVUkgPyBcImltcG9ydCBzd2FnZ2VyVWkgZnJvbSAnc3dhZ2dlci11aS1leHByZXNzJztcIiA6IFwiXCJ9XG4gICAgICAgICR7b3B0aW9ucy5vcGVuQVBJLmVuYWJsZWQgPyBcImltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcXG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAncGF0aCc7XFxuXFxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcXG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xcbmNvbnN0IG9wZW5BUElTcGVjID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICdvcGVuYXBpLmpzb24nKSwgJ3V0Zi04JykpO1wiIDogXCJcIn1cbiAgICAgICAgJHt2YWxpZGF0aW9uQ29kZS5pbXBvcnRzfVxuICAgICAgICAke3ZhbGlkYXRpb25Db2RlLnZhbGlkYXRpb25SdW50aW1lfVxuXG4gICAgICAgIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbiAgICAgICAgJHt2YWxpZGF0aW9uQ29kZS5zZXR1cH1cbiAgICAgICAgJHt2YWxpZGF0aW9uQ29kZS5taWRkbGV3YXJlRmFjdG9yeX1cblxuICAgICAgICAvLyBNaWRkbGV3YXJlXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIGFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xuICAgICAgICBhcHAudXNlKGV4cHJlc3Muc3RhdGljKCdkaXN0JykpO1xuXG5cdFx0XHRcdC8vIFNlcnZlciBmdW5jdGlvbnNcblx0XHRcdFx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgJHtBcnJheS5mcm9tKHNlcnZlckZ1bmN0aW9ucy5lbnRyaWVzKCkpXG5cdFx0XHRcdFx0LmZsYXRNYXAoKFttb2R1bGVOYW1lLCB7IGZ1bmN0aW9ucywgZmlsZVBhdGggfV0pID0+XG5cdFx0XHRcdFx0XHRmdW5jdGlvbnNcblx0XHRcdFx0XHRcdFx0Lm1hcCgoZnVuY3Rpb25OYW1lKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qgcm91dGVQYXRoID0gb3B0aW9ucy5yb3V0ZVRyYW5zZm9ybShmaWxlUGF0aCwgZnVuY3Rpb25OYW1lKTtcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBtaWRkbGV3YXJlQ2FsbCA9IG9wdGlvbnMudmFsaWRhdGlvbj8uZW5hYmxlZFxuXHRcdFx0XHRcdFx0XHRcdFx0PyBgY3JlYXRlQ29udGV4dHVhbFZhbGlkYXRpb25NaWRkbGV3YXJlKCcke21vZHVsZU5hbWV9JywgJyR7ZnVuY3Rpb25OYW1lfScpLCBgXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IFwiXCI7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGBcbiAgICAgICAgICAgIGFwcC5wb3N0KCcke29wdGlvbnMuYXBpUHJlZml4fS8ke3JvdXRlUGF0aH0nLCAke21pZGRsZXdhcmVDYWxsfWFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZlckFjdGlvbnMuJHttb2R1bGVOYW1lfS4ke2Z1bmN0aW9uTmFtZX0oLi4ucmVxLmJvZHkpO1xuICAgICAgICAgICAgICAgIHJlcy5qc29uKHJlc3VsdCB8fCBcIiogTm8gcmVzcG9uc2UgKlwiKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxcYEVycm9yIGluICR7ZnVuY3Rpb25OYW1lfTogXFwke2Vycm9yLm1lc3NhZ2V9XFxgKTtcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICBgO1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHQuam9pbihcIlxcblwiKVxuXHRcdFx0XHRcdFx0XHQudHJpbSgpLFxuXHRcdFx0XHRcdClcblx0XHRcdFx0XHQuam9pbihcIlxcblwiKVxuXHRcdFx0XHRcdC50cmltKCl9XG5cblx0XHRcdFx0JHtcblx0XHRcdFx0XHRvcHRpb25zLm9wZW5BUEkuZW5hYmxlZFxuXHRcdFx0XHRcdFx0PyBgXG5cdFx0XHRcdC8vIE9wZW5BUEkgZW5kcG9pbnRzXG5cdFx0XHRcdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XHRcdGFwcC5nZXQoJyR7b3B0aW9ucy5vcGVuQVBJLnNwZWNQYXRofScsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0XHRcdHJlcy5qc29uKG9wZW5BUElTcGVjKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHQke1xuXHRcdFx0XHRcdG9wdGlvbnMub3BlbkFQSS5zd2FnZ2VyVUlcblx0XHRcdFx0XHRcdD8gYFxuXHRcdFx0XHQvLyBTd2FnZ2VyIFVJXG5cdFx0XHRcdGFwcC51c2UoJyR7b3B0aW9ucy5vcGVuQVBJLmRvY3NQYXRofScsIHN3YWdnZXJVaS5zZXJ2ZSwgc3dhZ2dlclVpLnNldHVwKG9wZW5BUElTcGVjKSk7XG5cdFx0XHRcdGBcblx0XHRcdFx0XHRcdDogXCJcIlxuXHRcdFx0XHR9XG5cdFx0XHRcdGBcblx0XHRcdFx0XHRcdDogXCJcIlxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3RhcnQgc2VydmVyXG5cdFx0XHRcdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDA7XG4gICAgICAgIGFwcC5saXN0ZW4ocG9ydCwgKCkgPT4ge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxcYFx1RDgzRFx1REU4MCBTZXJ2ZXIgbGlzdGVuaW5nOiBodHRwOi8vbG9jYWxob3N0OlxcJHtwb3J0fVxcYCk7XG5cdFx0XHRcdFx0JHtcblx0XHRcdFx0XHRcdG9wdGlvbnMub3BlbkFQSS5lbmFibGVkXG5cdFx0XHRcdFx0XHRcdD8gYFxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxcYFx1RDgzRFx1RENENiBBUEkgRG9jdW1lbnRhdGlvbjogaHR0cDovL2xvY2FsaG9zdDpcXCR7cG9ydH0ke29wdGlvbnMub3BlbkFQSS5kb2NzUGF0aH1cXGApO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxcYFx1RDgzRFx1RENDNCBPcGVuQVBJIFNwZWM6IGh0dHA6Ly9sb2NhbGhvc3Q6XFwke3BvcnR9JHtvcHRpb25zLm9wZW5BUEkuc3BlY1BhdGh9XFxgKTtcblx0XHRcdFx0XHRgXG5cdFx0XHRcdFx0XHRcdDogXCJcIlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cbiAgICAgICAgLy8gTGlzdCBhbGwgc2VydmVyIGZ1bmN0aW9uc1xuXHRcdFx0XHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgYDtcblxuXHRcdFx0dGhpcy5lbWl0RmlsZSh7XG5cdFx0XHRcdHR5cGU6IFwiYXNzZXRcIixcblx0XHRcdFx0ZmlsZU5hbWU6IFwic2VydmVyLmpzXCIsXG5cdFx0XHRcdHNvdXJjZTogc2VydmVyQ29kZSxcblx0XHRcdH0pO1xuXHRcdH0sXG5cdH07XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2xpZW50UHJveHkobW9kdWxlTmFtZSwgZnVuY3Rpb25zLCBvcHRpb25zLCBmaWxlUGF0aCkge1xuXHQvLyBBZGQgZGV2ZWxvcG1lbnQtb25seSBzYWZldHkgY2hlY2tzXG5cdGNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09IFwicHJvZHVjdGlvblwiO1xuXG5cdGxldCBjbGllbnRQcm94eSA9IGBcXG4vLyB2aXRlLXNlcnZlci1hY3Rpb25zOiAke21vZHVsZU5hbWV9XFxuYDtcblxuXHQvLyBBZGQgYSBndWFyZCB0byBwcmV2ZW50IGRpcmVjdCBpbXBvcnRzIG9mIHNlcnZlciBjb2RlXG5cdGlmIChpc0Rldikge1xuXHRcdGNsaWVudFByb3h5ICs9IGBcbi8vIERldmVsb3BtZW50LW9ubHkgc2FmZXR5IGNoZWNrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gVGhpcyBjb2RlIGlzIHJ1bm5pbmcgaW4gdGhlIGJyb3dzZXJcbiAgY29uc3Qgc2VydmVyRmlsZUVycm9yID0gbmV3IEVycm9yKFxuICAgICdbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gU0VDVVJJVFkgV0FSTklORzogU2VydmVyIGZpbGUgXCIke21vZHVsZU5hbWV9XCIgaXMgYmVpbmcgaW1wb3J0ZWQgaW4gY2xpZW50IGNvZGUhICcgK1xuICAgICdUaGlzIGNvdWxkIGV4cG9zZSBzZXJ2ZXItc2lkZSBjb2RlIHRvIHRoZSBicm93c2VyLiBPbmx5IGltcG9ydCBzZXJ2ZXIgYWN0aW9ucyB0aHJvdWdoIHRoZSBwbHVnaW4uJ1xuICApO1xuICBzZXJ2ZXJGaWxlRXJyb3IubmFtZSA9ICdTZXJ2ZXJDb2RlSW5DbGllbnRFcnJvcic7XG4gIFxuICAvLyBDaGVjayBpZiB3ZSdyZSBpbiBhIHNlcnZlciBhY3Rpb24gcHJveHkgY29udGV4dFxuICBpZiAoIXdpbmRvdy5fX1ZJVEVfU0VSVkVSX0FDVElPTlNfUFJPWFlfXykge1xuICAgIGNvbnNvbGUuZXJyb3Ioc2VydmVyRmlsZUVycm9yKTtcbiAgICAvLyBJbiBkZXZlbG9wbWVudCwgd2UnbGwgd2FybiBidXQgbm90IHRocm93IHRvIGF2b2lkIGJyZWFraW5nIEhNUlxuICAgIGNvbnNvbGUuZXJyb3IoJ1N0YWNrIHRyYWNlOicsIHNlcnZlckZpbGVFcnJvci5zdGFjayk7XG4gIH1cbn1cbmA7XG5cdH1cblxuXHRmdW5jdGlvbnMuZm9yRWFjaCgoZnVuY3Rpb25OYW1lKSA9PiB7XG5cdFx0Y29uc3Qgcm91dGVQYXRoID0gb3B0aW9ucy5yb3V0ZVRyYW5zZm9ybShmaWxlUGF0aCwgZnVuY3Rpb25OYW1lKTtcblxuXHRcdGNsaWVudFByb3h5ICs9IGBcbiAgICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiAke2Z1bmN0aW9uTmFtZX0oLi4uYXJncykge1xuICAgICAgXHRjb25zb2xlLmxvZyhcIltWaXRlIFNlcnZlciBBY3Rpb25zXSBcdUQ4M0RcdURFODAgLSBFeGVjdXRpbmcgJHtmdW5jdGlvbk5hbWV9XCIpO1xuICAgICAgICBcbiAgICAgICAgJHtcblx0XHRcdFx0XHRpc0RldlxuXHRcdFx0XHRcdFx0PyBgXG4gICAgICAgIC8vIERldmVsb3BtZW50LW9ubHk6IE1hcmsgdGhhdCB3ZSdyZSBpbiBhIHZhbGlkIHByb3h5IGNvbnRleHRcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgd2luZG93Ll9fVklURV9TRVJWRVJfQUNUSU9OU19QUk9YWV9fID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgYXJndW1lbnRzIGluIGRldmVsb3BtZW50XG4gICAgICAgIGlmIChhcmdzLnNvbWUoYXJnID0+IHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ1tWaXRlIFNlcnZlciBBY3Rpb25zXSBXYXJuaW5nOiBGdW5jdGlvbnMgY2Fubm90IGJlIHNlcmlhbGl6ZWQgYW5kIHNlbnQgdG8gdGhlIHNlcnZlci4gJyArXG4gICAgICAgICAgICAnRnVuY3Rpb24gYXJndW1lbnRzIHdpbGwgYmUgY29udmVydGVkIHRvIG51bGwuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgYFxuXHRcdFx0XHRcdFx0OiBcIlwiXG5cdFx0XHRcdH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnJHtvcHRpb25zLmFwaVByZWZpeH0vJHtyb3V0ZVBhdGh9Jywge1xuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGFyZ3MpXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICBsZXQgZXJyb3JEYXRhO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgIGVycm9yRGF0YSA9IHsgZXJyb3I6ICdVbmtub3duIGVycm9yJywgZGV0YWlsczogJ0ZhaWxlZCB0byBwYXJzZSBlcnJvciByZXNwb25zZScgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltWaXRlIFNlcnZlciBBY3Rpb25zXSBcdTI3NTcgLSBFcnJvciBpbiAke2Z1bmN0aW9uTmFtZX06XCIsIGVycm9yRGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGVycm9yRGF0YS5lcnJvciB8fCAnU2VydmVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICBlcnJvci5kZXRhaWxzID0gZXJyb3JEYXRhLmRldGFpbHM7XG4gICAgICAgICAgICBlcnJvci5zdGF0dXMgPSByZXNwb25zZS5zdGF0dXM7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhcIltWaXRlIFNlcnZlciBBY3Rpb25zXSBcdTI3MDUgLSAke2Z1bmN0aW9uTmFtZX0gZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5XCIpO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgICBcbiAgICAgICAgICAke1xuXHRcdFx0XHRcdFx0aXNEZXZcblx0XHRcdFx0XHRcdFx0PyBgXG4gICAgICAgICAgLy8gRGV2ZWxvcG1lbnQtb25seTogQ2xlYXIgdGhlIHByb3h5IGNvbnRleHRcbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fX1ZJVEVfU0VSVkVSX0FDVElPTlNfUFJPWFlfXyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBgXG5cdFx0XHRcdFx0XHRcdDogXCJcIlxuXHRcdFx0XHRcdH1cbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgIFxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gXHUyNzU3IC0gTmV0d29yayBvciBleGVjdXRpb24gZXJyb3IgaW4gJHtmdW5jdGlvbk5hbWV9OlwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICBcbiAgICAgICAgICAke1xuXHRcdFx0XHRcdFx0aXNEZXZcblx0XHRcdFx0XHRcdFx0PyBgXG4gICAgICAgICAgLy8gRGV2ZWxvcG1lbnQtb25seTogQ2xlYXIgdGhlIHByb3h5IGNvbnRleHQgb24gZXJyb3JcbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHdpbmRvdy5fX1ZJVEVfU0VSVkVSX0FDVElPTlNfUFJPWFlfXyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBgXG5cdFx0XHRcdFx0XHRcdDogXCJcIlxuXHRcdFx0XHRcdH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZS10aHJvdyB3aXRoIG1vcmUgY29udGV4dCBpZiBpdCdzIG5vdCBhbHJlYWR5IG91ciBjdXN0b20gZXJyb3JcbiAgICAgICAgICBpZiAoIWVycm9yLmRldGFpbHMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmtFcnJvciA9IG5ldyBFcnJvcihcXGBGYWlsZWQgdG8gZXhlY3V0ZSBzZXJ2ZXIgYWN0aW9uICdcXCR7ZnVuY3Rpb25OYW1lfSc6IFxcJHtlcnJvci5tZXNzYWdlfVxcYCk7XG4gICAgICAgICAgICBuZXR3b3JrRXJyb3Iub3JpZ2luYWxFcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhyb3cgbmV0d29ya0Vycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIGA7XG5cdH0pO1xuXHRyZXR1cm4gY2xpZW50UHJveHk7XG59XG5cbi8vIEV4cG9ydCBidWlsdC1pbiBtaWRkbGV3YXJlIGFuZCB2YWxpZGF0aW9uIHV0aWxpdGllc1xuZXhwb3J0IHsgbWlkZGxld2FyZSB9O1xuZXhwb3J0IHsgY3JlYXRlVmFsaWRhdGlvbk1pZGRsZXdhcmUsIFZhbGlkYXRpb25BZGFwdGVyLCBab2RBZGFwdGVyLCBTY2hlbWFEaXNjb3ZlcnksIGFkYXB0ZXJzIH0gZnJvbSBcIi4vdmFsaWRhdGlvbi5qc1wiO1xuZXhwb3J0IHsgT3BlbkFQSUdlbmVyYXRvciwgc2V0dXBPcGVuQVBJRW5kcG9pbnRzLCBjcmVhdGVTd2FnZ2VyTWlkZGxld2FyZSB9IGZyb20gXCIuL29wZW5hcGkuanNcIjtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjL3ZhbGlkYXRpb24uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvdmFsaWRhdGlvbi5qc1wiO2ltcG9ydCB7IHogfSBmcm9tIFwiem9kXCI7XG5pbXBvcnQgeyBjcmVhdGVFcnJvclJlc3BvbnNlIH0gZnJvbSBcIi4vc2VjdXJpdHkuanNcIjtcbmltcG9ydCB7IGV4dGVuZFpvZFdpdGhPcGVuQXBpLCBPcGVuQVBJUmVnaXN0cnksIE9wZW5BcGlHZW5lcmF0b3JWMyB9IGZyb20gXCJAYXN0ZWFzb2x1dGlvbnMvem9kLXRvLW9wZW5hcGlcIjtcblxuLy8gRXh0ZW5kIFpvZCB3aXRoIE9wZW5BUEkgc3VwcG9ydFxuZXh0ZW5kWm9kV2l0aE9wZW5BcGkoeik7XG5cbi8qKlxuICogQmFzZSB2YWxpZGF0aW9uIGFkYXB0ZXIgaW50ZXJmYWNlXG4gKi9cbmV4cG9ydCBjbGFzcyBWYWxpZGF0aW9uQWRhcHRlciB7XG5cdC8qKlxuXHQgKiBWYWxpZGF0ZSBkYXRhIGFnYWluc3QgYSBzY2hlbWFcblx0ICogQHBhcmFtIHthbnl9IHNjaGVtYSAtIFRoZSB2YWxpZGF0aW9uIHNjaGVtYVxuXHQgKiBAcGFyYW0ge2FueX0gZGF0YSAtIFRoZSBkYXRhIHRvIHZhbGlkYXRlXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPHtzdWNjZXNzOiBib29sZWFuLCBkYXRhPzogYW55LCBlcnJvcnM/OiBhbnlbXX0+fVxuXHQgKi9cblx0YXN5bmMgdmFsaWRhdGUoc2NoZW1hLCBkYXRhKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiVmFsaWRhdGlvbkFkYXB0ZXIudmFsaWRhdGUgbXVzdCBiZSBpbXBsZW1lbnRlZFwiKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0IHNjaGVtYSB0byBPcGVuQVBJIHNjaGVtYSBmb3JtYXRcblx0ICogQHBhcmFtIHthbnl9IHNjaGVtYSAtIFRoZSB2YWxpZGF0aW9uIHNjaGVtYVxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fSBPcGVuQVBJIHNjaGVtYSBvYmplY3Rcblx0ICovXG5cdHRvT3BlbkFQSVNjaGVtYShzY2hlbWEpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJWYWxpZGF0aW9uQWRhcHRlci50b09wZW5BUElTY2hlbWEgbXVzdCBiZSBpbXBsZW1lbnRlZFwiKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXQgcGFyYW1ldGVyIGRlZmluaXRpb25zIGZvciBPcGVuQVBJXG5cdCAqIEBwYXJhbSB7YW55fSBzY2hlbWEgLSBUaGUgdmFsaWRhdGlvbiBzY2hlbWFcblx0ICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBPcGVuQVBJIHBhcmFtZXRlciBvYmplY3RzXG5cdCAqL1xuXHRnZXRQYXJhbWV0ZXJzKHNjaGVtYSkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb25BZGFwdGVyLmdldFBhcmFtZXRlcnMgbXVzdCBiZSBpbXBsZW1lbnRlZFwiKTtcblx0fVxufVxuXG4vKipcbiAqIFpvZCB2YWxpZGF0aW9uIGFkYXB0ZXJcbiAqL1xuZXhwb3J0IGNsYXNzIFpvZEFkYXB0ZXIgZXh0ZW5kcyBWYWxpZGF0aW9uQWRhcHRlciB7XG5cdGFzeW5jIHZhbGlkYXRlKHNjaGVtYSwgZGF0YSkge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCB2YWxpZGF0ZWREYXRhID0gYXdhaXQgc2NoZW1hLnBhcnNlQXN5bmMoZGF0YSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxuXHRcdFx0XHRkYXRhOiB2YWxpZGF0ZWREYXRhLFxuXHRcdFx0fTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0aWYgKGVycm9yIGluc3RhbmNlb2Ygei5ab2RFcnJvcikge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRcdGVycm9yczogZXJyb3IuZXJyb3JzLm1hcCgoZXJyKSA9PiAoe1xuXHRcdFx0XHRcdFx0cGF0aDogZXJyLnBhdGguam9pbihcIi5cIiksXG5cdFx0XHRcdFx0XHRtZXNzYWdlOiBlcnIubWVzc2FnZSxcblx0XHRcdFx0XHRcdGNvZGU6IGVyci5jb2RlLFxuXHRcdFx0XHRcdFx0dmFsdWU6IGVyci5pbnB1dCxcblx0XHRcdFx0XHR9KSksXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdFx0ZXJyb3JzOiBbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cGF0aDogXCJyb290XCIsXG5cdFx0XHRcdFx0XHRtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuXHRcdFx0XHRcdFx0Y29kZTogXCJ1bmtub3duXCIsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XSxcblx0XHRcdH07XG5cdFx0fVxuXHR9XG5cblx0dG9PcGVuQVBJU2NoZW1hKHNjaGVtYSkge1xuXHRcdHRyeSB7XG5cdFx0XHQvLyBVc2UgQGFzdGVhc29sdXRpb25zL3pvZC10by1vcGVuYXBpIGZvciBjb252ZXJzaW9uXG5cdFx0XHRjb25zdCByZWdpc3RyeSA9IG5ldyBPcGVuQVBJUmVnaXN0cnkoKTtcblx0XHRcdGNvbnN0IHNjaGVtYU5hbWUgPSBcIl9UZW1wU2NoZW1hXCI7XG5cblx0XHRcdC8vIFRoZSBsaWJyYXJ5IHJlcXVpcmVzIHNjaGVtYXMgdG8gYmUgcmVnaXN0ZXJlZCB3aXRoIG9wZW5hcGkgbWV0YWRhdGFcblx0XHRcdC8vIEZvciBzaW1wbGUgY29udmVyc2lvbiwgd2UnbGwgY3JlYXRlIGEgdGVtcG9yYXJ5IHJlZ2lzdHJ5XG5cdFx0XHRjb25zdCBleHRlbmRlZFNjaGVtYSA9IHNjaGVtYS5vcGVuYXBpID8gc2NoZW1hIDogc2NoZW1hO1xuXHRcdFx0cmVnaXN0cnkucmVnaXN0ZXIoc2NoZW1hTmFtZSwgZXh0ZW5kZWRTY2hlbWEpO1xuXG5cdFx0XHQvLyBHZW5lcmF0ZSB0aGUgT3BlbkFQSSBjb21wb25lbnRzXG5cdFx0XHRjb25zdCBnZW5lcmF0b3IgPSBuZXcgT3BlbkFwaUdlbmVyYXRvclYzKHJlZ2lzdHJ5LmRlZmluaXRpb25zKTtcblx0XHRcdGNvbnN0IGNvbXBvbmVudHMgPSBnZW5lcmF0b3IuZ2VuZXJhdGVDb21wb25lbnRzKCk7XG5cblx0XHRcdC8vIEV4dHJhY3QgdGhlIHNjaGVtYSBmcm9tIGNvbXBvbmVudHNcblx0XHRcdGNvbnN0IG9wZW5BUElTY2hlbWEgPSBjb21wb25lbnRzLmNvbXBvbmVudHM/LnNjaGVtYXM/LltzY2hlbWFOYW1lXTtcblxuXHRcdFx0aWYgKCFvcGVuQVBJU2NoZW1hKSB7XG5cdFx0XHRcdC8vIEZhbGxiYWNrIGZvciBzY2hlbWFzIHRoYXQgY291bGRuJ3QgYmUgY29udmVydGVkXG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IFwib2JqZWN0XCIsIGRlc2NyaXB0aW9uOiBcIlNjaGVtYSBjb252ZXJzaW9uIG5vdCBzdXBwb3J0ZWRcIiB9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gb3BlbkFQSVNjaGVtYTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y29uc29sZS53YXJuKGBGYWlsZWQgdG8gY29udmVydCBab2Qgc2NoZW1hIHRvIE9wZW5BUEk6ICR7ZXJyb3IubWVzc2FnZX1gKTtcblx0XHRcdHJldHVybiB7IHR5cGU6IFwib2JqZWN0XCIsIGRlc2NyaXB0aW9uOiBcIlNjaGVtYSBjb252ZXJzaW9uIGZhaWxlZFwiIH07XG5cdFx0fVxuXHR9XG5cblx0Z2V0UGFyYW1ldGVycyhzY2hlbWEpIHtcblx0XHRpZiAoIXNjaGVtYSB8fCB0eXBlb2Ygc2NoZW1hLl9kZWYgPT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cblx0XHQvLyBGb3IgZnVuY3Rpb24gcGFyYW1ldGVycywgd2UgZXhwZWN0IGFuIGFycmF5IHNjaGVtYSBvciBvYmplY3Qgc2NoZW1hXG5cdFx0aWYgKHNjaGVtYS5fZGVmLnR5cGVOYW1lID09PSBcIlpvZEFycmF5XCIpIHtcblx0XHRcdC8vIEFycmF5IG9mIHBhcmFtZXRlcnMgLSBjb252ZXJ0IGVhY2ggaXRlbSB0byBhIHBhcmFtZXRlclxuXHRcdFx0Y29uc3QgaXRlbVNjaGVtYSA9IHNjaGVtYS5fZGVmLnR5cGU7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc2NoZW1hVG9QYXJhbWV0ZXJzKGl0ZW1TY2hlbWEsIFwiYm9keVwiKTtcblx0XHR9IGVsc2UgaWYgKHNjaGVtYS5fZGVmLnR5cGVOYW1lID09PSBcIlpvZE9iamVjdFwiKSB7XG5cdFx0XHQvLyBPYmplY3QgcGFyYW1ldGVycyAtIGNvbnZlcnQgZWFjaCBwcm9wZXJ0eSB0byBhIHBhcmFtZXRlclxuXHRcdFx0cmV0dXJuIHRoaXMuX29iamVjdFRvUGFyYW1ldGVycyhzY2hlbWEpO1xuXHRcdH1cblxuXHRcdHJldHVybiBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6IFwiZGF0YVwiLFxuXHRcdFx0XHRpbjogXCJib2R5XCIsXG5cdFx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0XHRzY2hlbWE6IHRoaXMudG9PcGVuQVBJU2NoZW1hKHNjaGVtYSksXG5cdFx0XHR9LFxuXHRcdF07XG5cdH1cblxuXHRfb2JqZWN0VG9QYXJhbWV0ZXJzKHpvZE9iamVjdCkge1xuXHRcdGNvbnN0IHNoYXBlID0gem9kT2JqZWN0Ll9kZWYuc2hhcGUoKTtcblx0XHRjb25zdCBwYXJhbWV0ZXJzID0gW107XG5cblx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzaGFwZSkpIHtcblx0XHRcdHBhcmFtZXRlcnMucHVzaCh7XG5cdFx0XHRcdG5hbWU6IGtleSxcblx0XHRcdFx0aW46IFwiYm9keVwiLFxuXHRcdFx0XHRyZXF1aXJlZDogIXZhbHVlLmlzT3B0aW9uYWwoKSxcblx0XHRcdFx0c2NoZW1hOiB0aGlzLnRvT3BlbkFQSVNjaGVtYSh2YWx1ZSksXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiB2YWx1ZS5kZXNjcmlwdGlvbiB8fCBgUGFyYW1ldGVyOiAke2tleX1gLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBhcmFtZXRlcnM7XG5cdH1cblxuXHRfc2NoZW1hVG9QYXJhbWV0ZXJzKHNjaGVtYSwgbG9jYXRpb24gPSBcImJvZHlcIikge1xuXHRcdHJldHVybiBbXG5cdFx0XHR7XG5cdFx0XHRcdG5hbWU6IFwiZGF0YVwiLFxuXHRcdFx0XHRpbjogbG9jYXRpb24sXG5cdFx0XHRcdHJlcXVpcmVkOiB0cnVlLFxuXHRcdFx0XHRzY2hlbWE6IHRoaXMudG9PcGVuQVBJU2NoZW1hKHNjaGVtYSksXG5cdFx0XHR9LFxuXHRcdF07XG5cdH1cbn1cblxuLyoqXG4gKiBTY2hlbWEgZGlzY292ZXJ5IHV0aWxpdGllc1xuICovXG5leHBvcnQgY2xhc3MgU2NoZW1hRGlzY292ZXJ5IHtcblx0Y29uc3RydWN0b3IoYWRhcHRlciA9IG5ldyBab2RBZGFwdGVyKCkpIHtcblx0XHR0aGlzLmFkYXB0ZXIgPSBhZGFwdGVyO1xuXHRcdHRoaXMuc2NoZW1hcyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZWdpc3RlciBhIHNjaGVtYSBmb3IgYSBmdW5jdGlvblxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSAtIE1vZHVsZSBuYW1lXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgLSBGdW5jdGlvbiBuYW1lXG5cdCAqIEBwYXJhbSB7YW55fSBzY2hlbWEgLSBWYWxpZGF0aW9uIHNjaGVtYVxuXHQgKi9cblx0cmVnaXN0ZXJTY2hlbWEobW9kdWxlTmFtZSwgZnVuY3Rpb25OYW1lLCBzY2hlbWEpIHtcblx0XHRjb25zdCBrZXkgPSBgJHttb2R1bGVOYW1lfS4ke2Z1bmN0aW9uTmFtZX1gO1xuXHRcdHRoaXMuc2NoZW1hcy5zZXQoa2V5LCBzY2hlbWEpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBzY2hlbWEgZm9yIGEgZnVuY3Rpb25cblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBNb2R1bGUgbmFtZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZnVuY3Rpb25OYW1lIC0gRnVuY3Rpb24gbmFtZVxuXHQgKiBAcmV0dXJucyB7YW55fG51bGx9IFNjaGVtYSBvciBudWxsIGlmIG5vdCBmb3VuZFxuXHQgKi9cblx0Z2V0U2NoZW1hKG1vZHVsZU5hbWUsIGZ1bmN0aW9uTmFtZSkge1xuXHRcdGNvbnN0IGtleSA9IGAke21vZHVsZU5hbWV9LiR7ZnVuY3Rpb25OYW1lfWA7XG5cdFx0cmV0dXJuIHRoaXMuc2NoZW1hcy5nZXQoa2V5KSB8fCBudWxsO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBhbGwgc2NoZW1hc1xuXHQgKiBAcmV0dXJucyB7TWFwfSBBbGwgcmVnaXN0ZXJlZCBzY2hlbWFzXG5cdCAqL1xuXHRnZXRBbGxTY2hlbWFzKCkge1xuXHRcdHJldHVybiBuZXcgTWFwKHRoaXMuc2NoZW1hcyk7XG5cdH1cblxuXHQvKipcblx0ICogRGlzY292ZXIgc2NoZW1hcyBmcm9tIG1vZHVsZSBleHBvcnRzXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBtb2R1bGUgLSBNb2R1bGUgd2l0aCBleHBvcnRlZCBmdW5jdGlvbnNcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBNb2R1bGUgbmFtZVxuXHQgKi9cblx0ZGlzY292ZXJGcm9tTW9kdWxlKG1vZHVsZSwgbW9kdWxlTmFtZSkge1xuXHRcdGZvciAoY29uc3QgW2Z1bmN0aW9uTmFtZSwgZm5dIG9mIE9iamVjdC5lbnRyaWVzKG1vZHVsZSkpIHtcblx0XHRcdGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHQvLyBDaGVjayBpZiBmdW5jdGlvbiBoYXMgYXR0YWNoZWQgc2NoZW1hXG5cdFx0XHRcdGlmIChmbi5zY2hlbWEpIHtcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyU2NoZW1hKG1vZHVsZU5hbWUsIGZ1bmN0aW9uTmFtZSwgZm4uc2NoZW1hKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENoZWNrIGZvciBKU0RvYyBzY2hlbWEgYW5ub3RhdGlvbnMgKGZ1dHVyZSBlbmhhbmNlbWVudClcblx0XHRcdFx0Ly8gVGhpcyB3b3VsZCByZXF1aXJlIHBhcnNpbmcgSlNEb2MgY29tbWVudHMgZnJvbSB0aGUgZnVuY3Rpb25cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQ2xlYXIgYWxsIHNjaGVtYXNcblx0ICovXG5cdGNsZWFyKCkge1xuXHRcdHRoaXMuc2NoZW1hcy5jbGVhcigpO1xuXHR9XG59XG5cbi8qKlxuICogVmFsaWRhdGlvbiBtaWRkbGV3YXJlIGZhY3RvcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZhbGlkYXRpb25NaWRkbGV3YXJlKG9wdGlvbnMgPSB7fSkge1xuXHRjb25zdCBhZGFwdGVyID0gb3B0aW9ucy5hZGFwdGVyIHx8IG5ldyBab2RBZGFwdGVyKCk7XG5cdGNvbnN0IHNjaGVtYURpc2NvdmVyeSA9IG9wdGlvbnMuc2NoZW1hRGlzY292ZXJ5IHx8IG5ldyBTY2hlbWFEaXNjb3ZlcnkoYWRhcHRlcik7XG5cblx0cmV0dXJuIGFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRpb25NaWRkbGV3YXJlKHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0bGV0IG1vZHVsZU5hbWUsIGZ1bmN0aW9uTmFtZSwgc2NoZW1hO1xuXG5cdFx0Ly8gQ2hlY2sgZm9yIGNvbnRleHQgZnJvbSByb3V0ZSBzZXR1cFxuXHRcdGlmIChyZXEudmFsaWRhdGlvbkNvbnRleHQpIHtcblx0XHRcdG1vZHVsZU5hbWUgPSByZXEudmFsaWRhdGlvbkNvbnRleHQubW9kdWxlTmFtZTtcblx0XHRcdGZ1bmN0aW9uTmFtZSA9IHJlcS52YWxpZGF0aW9uQ29udGV4dC5mdW5jdGlvbk5hbWU7XG5cdFx0XHRzY2hlbWEgPSByZXEudmFsaWRhdGlvbkNvbnRleHQuc2NoZW1hO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGYWxsYmFjayB0byBVUkwgcGFyc2luZyBhbmQgc2NoZW1hIGRpc2NvdmVyeVxuXHRcdFx0Y29uc3QgdXJsUGFydHMgPSByZXEudXJsLnNwbGl0KFwiL1wiKTtcblx0XHRcdGZ1bmN0aW9uTmFtZSA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0bW9kdWxlTmFtZSA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDJdO1xuXHRcdFx0c2NoZW1hID0gc2NoZW1hRGlzY292ZXJ5LmdldFNjaGVtYShtb2R1bGVOYW1lLCBmdW5jdGlvbk5hbWUpO1xuXHRcdH1cblxuXHRcdGlmICghc2NoZW1hKSB7XG5cdFx0XHQvLyBObyBzY2hlbWEgZGVmaW5lZCwgc2tpcCB2YWxpZGF0aW9uXG5cdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHQvLyBSZXF1ZXN0IGJvZHkgc2hvdWxkIGJlIGFuIGFycmF5IG9mIGFyZ3VtZW50cyBmb3Igc2VydmVyIGZ1bmN0aW9uc1xuXHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHJlcS5ib2R5KSB8fCByZXEuYm9keS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG5cdFx0XHRcdFx0NDAwLFxuXHRcdFx0XHRcdFwiUmVxdWVzdCBib2R5IG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXkgb2YgZnVuY3Rpb24gYXJndW1lbnRzXCIsXG5cdFx0XHRcdFx0XCJJTlZBTElEX1JFUVVFU1RfQk9EWVwiXG5cdFx0XHRcdCkpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBWYWxpZGF0ZSBiYXNlZCBvbiBzY2hlbWEgdHlwZVxuXHRcdFx0bGV0IHZhbGlkYXRpb25EYXRhO1xuXHRcdFx0aWYgKHNjaGVtYS5fZGVmPy50eXBlTmFtZSA9PT0gXCJab2RUdXBsZVwiKSB7XG5cdFx0XHRcdC8vIFNjaGVtYSBleHBlY3RzIG11bHRpcGxlIGFyZ3VtZW50cyAodHVwbGUpXG5cdFx0XHRcdHZhbGlkYXRpb25EYXRhID0gcmVxLmJvZHk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBTY2hlbWEgZXhwZWN0cyBzaW5nbGUgYXJndW1lbnQgKGZpcnN0IGVsZW1lbnQgb2YgYXJyYXkpXG5cdFx0XHRcdHZhbGlkYXRpb25EYXRhID0gcmVxLmJvZHlbMF07XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFkYXB0ZXIudmFsaWRhdGUoc2NoZW1hLCB2YWxpZGF0aW9uRGF0YSk7XG5cblx0XHRcdGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcblx0XHRcdFx0cmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKGNyZWF0ZUVycm9yUmVzcG9uc2UoXG5cdFx0XHRcdFx0NDAwLFxuXHRcdFx0XHRcdFwiVmFsaWRhdGlvbiBmYWlsZWRcIixcblx0XHRcdFx0XHRcIlZBTElEQVRJT05fRVJST1JcIixcblx0XHRcdFx0XHR7IHZhbGlkYXRpb25FcnJvcnM6IHJlc3VsdC5lcnJvcnMgfVxuXHRcdFx0XHQpKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVwbGFjZSByZXF1ZXN0IGJvZHkgd2l0aCB2YWxpZGF0ZWQgZGF0YVxuXHRcdFx0aWYgKHNjaGVtYS5fZGVmPy50eXBlTmFtZSA9PT0gXCJab2RUdXBsZVwiKSB7XG5cdFx0XHRcdHJlcS5ib2R5ID0gcmVzdWx0LmRhdGE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXEuYm9keSA9IFtyZXN1bHQuZGF0YV07XG5cdFx0XHR9XG5cblx0XHRcdG5leHQoKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihcIlZhbGlkYXRpb24gbWlkZGxld2FyZSBlcnJvcjpcIiwgZXJyb3IpO1xuXHRcdFx0cmVzLnN0YXR1cyg1MDApLmpzb24oY3JlYXRlRXJyb3JSZXNwb25zZShcblx0XHRcdFx0NTAwLFxuXHRcdFx0XHRcIkludGVybmFsIHZhbGlkYXRpb24gZXJyb3JcIixcblx0XHRcdFx0XCJWQUxJREFUSU9OX0lOVEVSTkFMX0VSUk9SXCIsXG5cdFx0XHRcdHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyB7IG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsIHN0YWNrOiBlcnJvci5zdGFjayB9IDogbnVsbFxuXHRcdFx0KSk7XG5cdFx0fVxuXHR9O1xufVxuXG4vLyBFeHBvcnQgZGVmYXVsdCBhZGFwdGVycyBhbmQgdXRpbGl0aWVzXG5leHBvcnQgY29uc3QgYWRhcHRlcnMgPSB7XG5cdHpvZDogWm9kQWRhcHRlcixcbn07XG5cbmV4cG9ydCBjb25zdCBkZWZhdWx0QWRhcHRlciA9IG5ldyBab2RBZGFwdGVyKCk7XG5leHBvcnQgY29uc3QgZGVmYXVsdFNjaGVtYURpc2NvdmVyeSA9IG5ldyBTY2hlbWFEaXNjb3ZlcnkoZGVmYXVsdEFkYXB0ZXIpO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyY1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvc2VjdXJpdHkuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvc2VjdXJpdHkuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLyoqXG4gKiBTYW5pdGl6ZSBhbmQgdmFsaWRhdGUgZmlsZSBwYXRocyB0byBwcmV2ZW50IGRpcmVjdG9yeSB0cmF2ZXJzYWwgYXR0YWNrc1xuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCB0byBzYW5pdGl6ZVxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VQYXRoIC0gVGhlIGJhc2UgZGlyZWN0b3J5IHRvIHJlc3RyaWN0IGFjY2VzcyB0b1xuICogQHJldHVybnMge3N0cmluZ3xudWxsfSAtIFNhbml0aXplZCBwYXRoIG9yIG51bGwgaWYgaW52YWxpZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVQYXRoKGZpbGVQYXRoLCBiYXNlUGF0aCkge1xuICBpZiAoIWZpbGVQYXRoIHx8IHR5cGVvZiBmaWxlUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEZvciB0ZXN0IGVudmlyb25tZW50cyBhbmQgZGV2ZWxvcG1lbnQgd2l0aCBhYnNvbHV0ZSBwYXRocyB0aGF0IGFyZSBhbHJlYWR5IHByb2plY3QtcmVsYXRpdmVcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAndGVzdCcgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICAvLyBGb3IgdGVzdCBwYXRocyBsaWtlIC9zcmMvdGVzdC5zZXJ2ZXIuanMsIHRyZWF0IGFzIHJlbGF0aXZlIHRvIGJhc2VQYXRoXG4gICAgaWYgKGZpbGVQYXRoLnN0YXJ0c1dpdGgoJy9zcmMvJykgfHwgZmlsZVBhdGguc3RhcnRzV2l0aCgnL3Byb2plY3QvJykpIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGZpbGVQYXRoLnN0YXJ0c1dpdGgoJy9wcm9qZWN0LycpID8gZmlsZVBhdGguc2xpY2UoJy9wcm9qZWN0LycubGVuZ3RoKSA6IGZpbGVQYXRoLnNsaWNlKDEpO1xuICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBwYXRoLnJlc29sdmUoYmFzZVBhdGgsIHJlbGF0aXZlUGF0aCk7XG4gICAgICAvLyBEZWJ1ZzogY29uc29sZS5sb2coYFRlc3QgcGF0aCByZXNvbHZlZDogJHtmaWxlUGF0aH0gLT4gJHtub3JtYWxpemVkUGF0aH1gKTtcbiAgICAgIHJldHVybiBub3JtYWxpemVkUGF0aDtcbiAgICB9XG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhbiBhYnNvbHV0ZSBwYXRoIG91dHNpZGUgcHJvamVjdCBzdHJ1Y3R1cmUgKGxpa2UgL2V0Yy9wYXNzd2QpXG4gICAgaWYgKHBhdGguaXNBYnNvbHV0ZShmaWxlUGF0aCkpIHtcbiAgICAgIC8vIERlYnVnOiBjb25zb2xlLmxvZyhgVGVzdCBhYnNvbHV0ZSBwYXRoIGFsbG93ZWQ6ICR7ZmlsZVBhdGh9YCk7XG4gICAgICByZXR1cm4gZmlsZVBhdGg7IC8vIEFsbG93IG90aGVyIGFic29sdXRlIHBhdGhzIGluIHRlc3RzIChmb3IgZWRnZSBjYXNlIHRlc3RzKVxuICAgIH1cbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aHNcbiAgY29uc3Qgbm9ybWFsaXplZEJhc2UgPSBwYXRoLnJlc29sdmUoYmFzZVBhdGgpO1xuICBjb25zdCBub3JtYWxpemVkUGF0aCA9IHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgZmlsZVBhdGgpO1xuXG4gIC8vIENoZWNrIGlmIHRoZSByZXNvbHZlZCBwYXRoIGlzIHdpdGhpbiB0aGUgYmFzZSBkaXJlY3RvcnlcbiAgaWYgKCFub3JtYWxpemVkUGF0aC5zdGFydHNXaXRoKG5vcm1hbGl6ZWRCYXNlICsgcGF0aC5zZXApICYmIG5vcm1hbGl6ZWRQYXRoICE9PSBub3JtYWxpemVkQmFzZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoYFBhdGggdHJhdmVyc2FsIGF0dGVtcHQgZGV0ZWN0ZWQ6ICR7ZmlsZVBhdGh9YCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3VzcGljaW91cyBwYXR0ZXJuc1xuICBjb25zdCBzdXNwaWNpb3VzUGF0dGVybnMgPSBbXG4gICAgL1xcMC8sIC8vIE51bGwgYnl0ZXNcbiAgICAvXihjb258cHJufGF1eHxudWx8Y29tWzAtOV18bHB0WzAtOV0pKFxcLi4qKT8kL2ksIC8vIFdpbmRvd3MgcmVzZXJ2ZWQgbmFtZXNcbiAgXTtcblxuICBjb25zdCBwYXRoU2VnbWVudHMgPSBmaWxlUGF0aC5zcGxpdCgvWy9cXFxcXS8pO1xuICBmb3IgKGNvbnN0IHNlZ21lbnQgb2YgcGF0aFNlZ21lbnRzKSB7XG4gICAgaWYgKHN1c3BpY2lvdXNQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KHNlZ21lbnQpKSkge1xuICAgICAgY29uc29sZS5lcnJvcihgU3VzcGljaW91cyBwYXRoIHNlZ21lbnQgZGV0ZWN0ZWQ6ICR7c2VnbWVudH1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVkUGF0aDtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBtb2R1bGUgbmFtZSB0byBwcmV2ZW50IGluamVjdGlvbiBhdHRhY2tzXG4gKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSAtIFRoZSBtb2R1bGUgbmFtZSB0byB2YWxpZGF0ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkTW9kdWxlTmFtZShtb2R1bGVOYW1lKSB7XG4gIGlmICghbW9kdWxlTmFtZSB8fCB0eXBlb2YgbW9kdWxlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBNb2R1bGUgbmFtZSBzaG91bGQgb25seSBjb250YWluIGFscGhhbnVtZXJpYywgdW5kZXJzY29yZSwgYW5kIGRhc2hcbiAgLy8gTm8gZG90cyB0byBwcmV2ZW50IGRpcmVjdG9yeSB0cmF2ZXJzYWwgdmlhIG1vZHVsZSBuYW1lc1xuICBjb25zdCB2YWxpZFBhdHRlcm4gPSAvXlthLXpBLVowLTlfLV0rJC87XG4gIHJldHVybiB2YWxpZFBhdHRlcm4udGVzdChtb2R1bGVOYW1lKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBzZWN1cmUgbW9kdWxlIG5hbWUgZnJvbSBhIGZpbGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlY3VyZU1vZHVsZU5hbWUoZmlsZVBhdGgpIHtcbiAgLy8gUmVtb3ZlIGFueSBwb3RlbnRpYWxseSBkYW5nZXJvdXMgY2hhcmFjdGVyc1xuICByZXR1cm4gZmlsZVBhdGhcbiAgICAucmVwbGFjZSgvW15hLXpBLVowLTlfLy1dL2csICdfJykgIC8vIFJlcGxhY2Ugbm9uLWFscGhhbnVtZXJpYyAoZXhjZXB0IHNsYXNoIGFuZCBkYXNoKVxuICAgIC5yZXBsYWNlKC9cXC8rL2csICdfJykgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHNsYXNoZXMgd2l0aCB1bmRlcnNjb3Jlc1xuICAgIC5yZXBsYWNlKC8tKy9nLCAnXycpICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgZGFzaGVzIHdpdGggdW5kZXJzY29yZXNcbiAgICAucmVwbGFjZSgvXysvZywgJ18nKSAgICAgICAgICAgICAgICAvLyBDb2xsYXBzZSBtdWx0aXBsZSB1bmRlcnNjb3Jlc1xuICAgIC5yZXBsYWNlKC9eX3xfJC9nLCAnJyk7ICAgICAgICAgICAgIC8vIFRyaW0gdW5kZXJzY29yZXMgZnJvbSBzdGFydC9lbmRcbn1cblxuLyoqXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZSBmYWN0b3J5XG4gKiBAcGFyYW0ge251bWJlcn0gc3RhdHVzIC0gSFRUUCBzdGF0dXMgY29kZVxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIC0gRXJyb3IgY29kZSBmb3IgY2xpZW50IGhhbmRsaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gW2RldGFpbHNdIC0gQWRkaXRpb25hbCBlcnJvciBkZXRhaWxzXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXJyb3JSZXNwb25zZShzdGF0dXMsIG1lc3NhZ2UsIGNvZGUgPSBudWxsLCBkZXRhaWxzID0gbnVsbCkge1xuICBjb25zdCBlcnJvciA9IHtcbiAgICBlcnJvcjogdHJ1ZSxcbiAgICBzdGF0dXMsXG4gICAgbWVzc2FnZSxcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICB9O1xuXG4gIGlmIChjb2RlKSB7XG4gICAgZXJyb3IuY29kZSA9IGNvZGU7XG4gIH1cblxuICBpZiAoZGV0YWlscykge1xuICAgIGVycm9yLmRldGFpbHMgPSBkZXRhaWxzO1xuICB9XG5cbiAgLy8gSW4gcHJvZHVjdGlvbiwgZG9uJ3QgZXhwb3NlIGludGVybmFsIGVycm9yIGRldGFpbHNcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgJiYgZGV0YWlscz8uc3RhY2spIHtcbiAgICBkZWxldGUgZGV0YWlscy5zdGFjaztcbiAgfVxuXG4gIHJldHVybiBlcnJvcjtcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyYy9vcGVuYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjL29wZW5hcGkuanNcIjtpbXBvcnQgc3dhZ2dlclVpIGZyb20gXCJzd2FnZ2VyLXVpLWV4cHJlc3NcIjtcbmltcG9ydCB7IGRlZmF1bHRBZGFwdGVyIH0gZnJvbSBcIi4vdmFsaWRhdGlvbi5qc1wiO1xuXG4vKipcbiAqIE9wZW5BUEkgc3BlY2lmaWNhdGlvbiBnZW5lcmF0b3JcbiAqL1xuZXhwb3J0IGNsYXNzIE9wZW5BUElHZW5lcmF0b3Ige1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcblx0XHR0aGlzLmFkYXB0ZXIgPSBvcHRpb25zLmFkYXB0ZXIgfHwgZGVmYXVsdEFkYXB0ZXI7XG5cdFx0dGhpcy5pbmZvID0ge1xuXHRcdFx0dGl0bGU6IFwiU2VydmVyIEFjdGlvbnMgQVBJXCIsXG5cdFx0XHR2ZXJzaW9uOiBcIjEuMC4wXCIsXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJBdXRvLWdlbmVyYXRlZCBBUEkgZG9jdW1lbnRhdGlvbiBmb3IgVml0ZSBTZXJ2ZXIgQWN0aW9uc1wiLFxuXHRcdFx0Li4ub3B0aW9ucy5pbmZvLFxuXHRcdH07XG5cdFx0dGhpcy5zZXJ2ZXJzID0gb3B0aW9ucy5zZXJ2ZXJzIHx8IFtcblx0XHRcdHtcblx0XHRcdFx0dXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6NTE3M1wiLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJEZXZlbG9wbWVudCBzZXJ2ZXJcIixcblx0XHRcdH0sXG5cdFx0XTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZSBjb21wbGV0ZSBPcGVuQVBJIHNwZWNpZmljYXRpb25cblx0ICogQHBhcmFtIHtNYXB9IHNlcnZlckZ1bmN0aW9ucyAtIE1hcCBvZiBzZXJ2ZXIgZnVuY3Rpb25zXG5cdCAqIEBwYXJhbSB7U2NoZW1hRGlzY292ZXJ5fSBzY2hlbWFEaXNjb3ZlcnkgLSBTY2hlbWEgZGlzY292ZXJ5IGluc3RhbmNlXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gR2VuZXJhdGlvbiBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IENvbXBsZXRlIE9wZW5BUEkgMy4wIHNwZWNpZmljYXRpb25cblx0ICovXG5cdGdlbmVyYXRlU3BlYyhzZXJ2ZXJGdW5jdGlvbnMsIHNjaGVtYURpc2NvdmVyeSwgb3B0aW9ucyA9IHt9KSB7XG5cdFx0Y29uc3Qgc3BlYyA9IHtcblx0XHRcdG9wZW5hcGk6IFwiMy4wLjNcIixcblx0XHRcdGluZm86IHRoaXMuaW5mbyxcblx0XHRcdHNlcnZlcnM6IHRoaXMuc2VydmVycyxcblx0XHRcdHBhdGhzOiB7fSxcblx0XHRcdGNvbXBvbmVudHM6IHtcblx0XHRcdFx0c2NoZW1hczoge30sXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHQvLyBHZW5lcmF0ZSBwYXRocyBmb3IgZWFjaCBzZXJ2ZXIgZnVuY3Rpb25cblx0XHRmb3IgKGNvbnN0IFttb2R1bGVOYW1lLCB7IGZ1bmN0aW9ucywgZmlsZVBhdGggfV0gb2Ygc2VydmVyRnVuY3Rpb25zKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGZ1bmN0aW9uTmFtZSBvZiBmdW5jdGlvbnMpIHtcblx0XHRcdFx0Ly8gVXNlIHJvdXRlVHJhbnNmb3JtIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgZmFsbCBiYWNrIHRvIGxlZ2FjeSBmb3JtYXRcblx0XHRcdFx0bGV0IHJvdXRlUGF0aDtcblx0XHRcdFx0aWYgKG9wdGlvbnMucm91dGVUcmFuc2Zvcm0gJiYgZmlsZVBhdGgpIHtcblx0XHRcdFx0XHRyb3V0ZVBhdGggPSBvcHRpb25zLnJvdXRlVHJhbnNmb3JtKGZpbGVQYXRoLCBmdW5jdGlvbk5hbWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIEZhbGxiYWNrIHRvIGxlZ2FjeSBmb3JtYXQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblx0XHRcdFx0XHRyb3V0ZVBhdGggPSBgJHttb2R1bGVOYW1lfS8ke2Z1bmN0aW9uTmFtZX1gO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgcGF0aCA9IGAke29wdGlvbnMuYXBpUHJlZml4IHx8IFwiL2FwaVwifS8ke3JvdXRlUGF0aH1gO1xuXHRcdFx0XHRjb25zdCBzY2hlbWEgPSBzY2hlbWFEaXNjb3ZlcnkuZ2V0U2NoZW1hKG1vZHVsZU5hbWUsIGZ1bmN0aW9uTmFtZSk7XG5cblx0XHRcdFx0c3BlYy5wYXRoc1twYXRoXSA9IHRoaXMuZ2VuZXJhdGVQYXRoSXRlbShtb2R1bGVOYW1lLCBmdW5jdGlvbk5hbWUsIHNjaGVtYSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNwZWM7XG5cdH1cblxuXHQvKipcblx0ICogR2VuZXJhdGUgT3BlbkFQSSBwYXRoIGl0ZW0gZm9yIGEgc2VydmVyIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gTW9kdWxlIG5hbWVcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAtIEZ1bmN0aW9uIG5hbWVcblx0ICogQHBhcmFtIHthbnl9IHNjaGVtYSAtIFZhbGlkYXRpb24gc2NoZW1hXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IE9wZW5BUEkgcGF0aCBpdGVtXG5cdCAqL1xuXHRnZW5lcmF0ZVBhdGhJdGVtKG1vZHVsZU5hbWUsIGZ1bmN0aW9uTmFtZSwgc2NoZW1hKSB7XG5cdFx0Y29uc3Qgb3BlcmF0aW9uSWQgPSBgJHttb2R1bGVOYW1lfV8ke2Z1bmN0aW9uTmFtZX1gO1xuXHRcdGNvbnN0IHRhZ3MgPSBbbW9kdWxlTmFtZV07XG5cblx0XHRjb25zdCBwYXRoSXRlbSA9IHtcblx0XHRcdHBvc3Q6IHtcblx0XHRcdFx0b3BlcmF0aW9uSWQsXG5cdFx0XHRcdHRhZ3MsXG5cdFx0XHRcdHN1bW1hcnk6IGBFeGVjdXRlICR7ZnVuY3Rpb25OYW1lfWAsXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBgRXhlY3V0ZSB0aGUgJHtmdW5jdGlvbk5hbWV9IHNlcnZlciBhY3Rpb24gZnJvbSAke21vZHVsZU5hbWV9IG1vZHVsZWAsXG5cdFx0XHRcdHJlcXVlc3RCb2R5OiB7XG5cdFx0XHRcdFx0cmVxdWlyZWQ6IHRydWUsXG5cdFx0XHRcdFx0Y29udGVudDoge1xuXHRcdFx0XHRcdFx0XCJhcHBsaWNhdGlvbi9qc29uXCI6IHtcblx0XHRcdFx0XHRcdFx0c2NoZW1hOiB0aGlzLmdlbmVyYXRlUmVxdWVzdFNjaGVtYShzY2hlbWEpLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXNwb25zZXM6IHtcblx0XHRcdFx0XHQyMDA6IHtcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlN1Y2Nlc3NmdWwgcmVzcG9uc2VcIixcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHtcblx0XHRcdFx0XHRcdFx0XCJhcHBsaWNhdGlvbi9qc29uXCI6IHtcblx0XHRcdFx0XHRcdFx0XHRzY2hlbWE6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJGdW5jdGlvbiByZXN1bHRcIixcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdDQwMDoge1xuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVmFsaWRhdGlvbiBlcnJvclwiLFxuXHRcdFx0XHRcdFx0Y29udGVudDoge1xuXHRcdFx0XHRcdFx0XHRcImFwcGxpY2F0aW9uL2pzb25cIjoge1xuXHRcdFx0XHRcdFx0XHRcdHNjaGVtYTogdGhpcy5nZXRFcnJvclNjaGVtYSgpLFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdDQwNDoge1xuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiRnVuY3Rpb24gbm90IGZvdW5kXCIsXG5cdFx0XHRcdFx0XHRjb250ZW50OiB7XG5cdFx0XHRcdFx0XHRcdFwiYXBwbGljYXRpb24vanNvblwiOiB7XG5cdFx0XHRcdFx0XHRcdFx0c2NoZW1hOiB0aGlzLmdldEVycm9yU2NoZW1hKCksXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0NTAwOiB7XG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIixcblx0XHRcdFx0XHRcdGNvbnRlbnQ6IHtcblx0XHRcdFx0XHRcdFx0XCJhcHBsaWNhdGlvbi9qc29uXCI6IHtcblx0XHRcdFx0XHRcdFx0XHRzY2hlbWE6IHRoaXMuZ2V0RXJyb3JTY2hlbWEoKSxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiBwYXRoSXRlbTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZSByZXF1ZXN0IHNjaGVtYSBmb3IgYSBzZXJ2ZXIgZnVuY3Rpb25cblx0ICogQHBhcmFtIHthbnl9IHNjaGVtYSAtIFZhbGlkYXRpb24gc2NoZW1hXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9IE9wZW5BUEkgc2NoZW1hIGZvciByZXF1ZXN0IGJvZHlcblx0ICovXG5cdGdlbmVyYXRlUmVxdWVzdFNjaGVtYShzY2hlbWEpIHtcblx0XHRpZiAoIXNjaGVtYSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0dHlwZTogXCJhcnJheVwiLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogXCJGdW5jdGlvbiBhcmd1bWVudHMgYXJyYXlcIixcblx0XHRcdFx0aXRlbXM6IHtcblx0XHRcdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIkZ1bmN0aW9uIGFyZ3VtZW50XCIsXG5cdFx0XHRcdH0sXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIFNlcnZlciBmdW5jdGlvbnMgcmVjZWl2ZSBhcmd1bWVudHMgYXMgYW4gYXJyYXlcblx0XHQvLyBCdXQgaWYgc2NoZW1hIGlzIGRlZmluZWQsIHdlIGFzc3VtZSBpdCB2YWxpZGF0ZXMgdGhlIGZpcnN0IGFyZ3VtZW50XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6IFwiYXJyYXlcIixcblx0XHRcdGRlc2NyaXB0aW9uOiBcIkZ1bmN0aW9uIGFyZ3VtZW50c1wiLFxuXHRcdFx0aXRlbXM6IHRoaXMuYWRhcHRlci50b09wZW5BUElTY2hlbWEoc2NoZW1hKSxcblx0XHR9O1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBzdGFuZGFyZCBlcnJvciByZXNwb25zZSBzY2hlbWFcblx0ICogQHJldHVybnMge29iamVjdH0gT3BlbkFQSSBlcnJvciBzY2hlbWFcblx0ICovXG5cdGdldEVycm9yU2NoZW1hKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiBcIm9iamVjdFwiLFxuXHRcdFx0cHJvcGVydGllczoge1xuXHRcdFx0XHRlcnJvcjoge1xuXHRcdFx0XHRcdHR5cGU6IFwic3RyaW5nXCIsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiRXJyb3IgbWVzc2FnZVwiLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkZXRhaWxzOiB7XG5cdFx0XHRcdFx0dHlwZTogXCJzdHJpbmdcIixcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJFcnJvciBkZXRhaWxzXCIsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHZhbGlkYXRpb25FcnJvcnM6IHtcblx0XHRcdFx0XHR0eXBlOiBcImFycmF5XCIsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiVmFsaWRhdGlvbiBlcnJvcnMgKGlmIGFwcGxpY2FibGUpXCIsXG5cdFx0XHRcdFx0aXRlbXM6IHtcblx0XHRcdFx0XHRcdHR5cGU6IFwib2JqZWN0XCIsXG5cdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7XG5cdFx0XHRcdFx0XHRcdHBhdGg6IHtcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInN0cmluZ1wiLFxuXHRcdFx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIkZpZWxkIHBhdGhcIixcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0bWVzc2FnZToge1xuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwic3RyaW5nXCIsXG5cdFx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiRXJyb3IgbWVzc2FnZVwiLFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRjb2RlOiB7XG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdHJpbmdcIixcblx0XHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJFcnJvciBjb2RlXCIsXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0cmVxdWlyZWQ6IFtcImVycm9yXCJdLFxuXHRcdH07XG5cdH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgU3dhZ2dlciBVSSBtaWRkbGV3YXJlXG4gKiBAcGFyYW0ge29iamVjdH0gb3BlbkFQSVNwZWMgLSBPcGVuQVBJIHNwZWNpZmljYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gU3dhZ2dlciBVSSBvcHRpb25zXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIG1pZGRsZXdhcmUgZnVuY3Rpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTd2FnZ2VyTWlkZGxld2FyZShvcGVuQVBJU3BlYywgb3B0aW9ucyA9IHt9KSB7XG5cdGNvbnN0IHN3YWdnZXJPcHRpb25zID0ge1xuXHRcdGN1c3RvbUNzczogYFxuXHRcdFx0LnN3YWdnZXItdWkgLnRvcGJhciB7IGRpc3BsYXk6IG5vbmU7IH1cblx0XHRcdC5zd2FnZ2VyLXVpIC5pbmZvIC50aXRsZSB7IGNvbG9yOiAjM2I4MmY2OyB9XG5cdFx0YCxcblx0XHRjdXN0b21TaXRlVGl0bGU6IFwiU2VydmVyIEFjdGlvbnMgQVBJIERvY3VtZW50YXRpb25cIixcblx0XHQuLi5vcHRpb25zLnN3YWdnZXJPcHRpb25zLFxuXHR9O1xuXG5cdHJldHVybiBbc3dhZ2dlclVpLnNlcnZlLCBzd2FnZ2VyVWkuc2V0dXAob3BlbkFQSVNwZWMsIHN3YWdnZXJPcHRpb25zKV07XG59XG5cbi8qKlxuICogU2V0dXAgT3BlbkFQSSBlbmRwb2ludHMgZm9yIGRldmVsb3BtZW50XG4gKiBAcGFyYW0ge0V4cHJlc3N9IGFwcCAtIEV4cHJlc3MgYXBwIGluc3RhbmNlXG4gKiBAcGFyYW0ge29iamVjdH0gb3BlbkFQSVNwZWMgLSBPcGVuQVBJIHNwZWNpZmljYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gU2V0dXAgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBPcGVuQVBJRW5kcG9pbnRzKGFwcCwgb3BlbkFQSVNwZWMsIG9wdGlvbnMgPSB7fSkge1xuXHRjb25zdCBkb2NzUGF0aCA9IG9wdGlvbnMuZG9jc1BhdGggfHwgXCIvYXBpL2RvY3NcIjtcblx0Y29uc3Qgc3BlY1BhdGggPSBvcHRpb25zLnNwZWNQYXRoIHx8IFwiL2FwaS9vcGVuYXBpLmpzb25cIjtcblxuXHQvLyBTZXJ2ZSBPcGVuQVBJIHNwZWNpZmljYXRpb24gYXMgSlNPTlxuXHRhcHAuZ2V0KHNwZWNQYXRoLCAocmVxLCByZXMpID0+IHtcblx0XHRyZXMuanNvbihvcGVuQVBJU3BlYyk7XG5cdH0pO1xuXG5cdC8vIFNlcnZlIFN3YWdnZXIgVUlcblx0aWYgKG9wdGlvbnMuZW5hYmxlU3dhZ2dlclVJICE9PSBmYWxzZSkge1xuXHRcdGNvbnN0IHN3YWdnZXJNaWRkbGV3YXJlID0gY3JlYXRlU3dhZ2dlck1pZGRsZXdhcmUob3BlbkFQSVNwZWMsIG9wdGlvbnMpO1xuXHRcdGFwcC51c2UoZG9jc1BhdGgsIC4uLnN3YWdnZXJNaWRkbGV3YXJlKTtcblxuXHRcdGNvbnNvbGUubG9nKGBcdUQ4M0RcdURDRDYgQVBJIERvY3VtZW50YXRpb246IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwcm9jZXNzLmVudi5QT1JUIHx8IDUxNzN9JHtkb2NzUGF0aH1gKTtcblx0XHRjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0M0IE9wZW5BUEkgU3BlYzogaHR0cDovL2xvY2FsaG9zdDoke3Byb2Nlc3MuZW52LlBPUlQgfHwgNTE3M30ke3NwZWNQYXRofWApO1xuXHR9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgT3BlbkFQSS1jb21wYXRpYmxlIHBhcmFtZXRlciBkZXNjcmlwdGlvbnMgZnJvbSBKU0RvY1xuICogQHBhcmFtIHtzdHJpbmd9IGpzZG9jIC0gSlNEb2MgY29tbWVudCBzdHJpbmdcbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgcGFyYW1ldGVyIGRlc2NyaXB0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKU0RvY1BhcmFtZXRlcnMoanNkb2MpIHtcblx0aWYgKCFqc2RvYykge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdGNvbnN0IHBhcmFtUmVnZXggPSAvQHBhcmFtXFxzK1xceyhbXn1dKylcXH1cXHMrKFxcWz9bXFx3Ll0rXFxdPylcXHMqLT9cXHMqKC4qKS9nO1xuXHRjb25zdCBwYXJhbWV0ZXJzID0gW107XG5cdGxldCBtYXRjaDtcblxuXHR3aGlsZSAoKG1hdGNoID0gcGFyYW1SZWdleC5leGVjKGpzZG9jKSkgIT09IG51bGwpIHtcblx0XHRjb25zdCBbLCB0eXBlLCBuYW1lLCBkZXNjcmlwdGlvbl0gPSBtYXRjaDtcblx0XHRjb25zdCBpc09wdGlvbmFsID0gbmFtZS5zdGFydHNXaXRoKFwiW1wiKSAmJiBuYW1lLmVuZHNXaXRoKFwiXVwiKTtcblx0XHRjb25zdCBwYXJhbU5hbWUgPSBuYW1lLnJlcGxhY2UoL15cXFt8XFxdJC9nLCBcIlwiKTtcblxuXHRcdHBhcmFtZXRlcnMucHVzaCh7XG5cdFx0XHRuYW1lOiBwYXJhbU5hbWUsXG5cdFx0XHR0eXBlOiB0eXBlLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24udHJpbSgpLFxuXHRcdFx0cmVxdWlyZWQ6ICFpc09wdGlvbmFsLFxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHBhcmFtZXRlcnM7XG59XG5cbi8qKlxuICogRW5oYW5jZWQgT3BlbkFQSSBnZW5lcmF0b3Igd2l0aCBKU0RvYyBzdXBwb3J0XG4gKi9cbmV4cG9ydCBjbGFzcyBFbmhhbmNlZE9wZW5BUElHZW5lcmF0b3IgZXh0ZW5kcyBPcGVuQVBJR2VuZXJhdG9yIHtcblx0LyoqXG5cdCAqIEdlbmVyYXRlIHBhdGggaXRlbSB3aXRoIEpTRG9jIGVuaGFuY2VtZW50XG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gTW9kdWxlIG5hbWVcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAtIEZ1bmN0aW9uIG5hbWVcblx0ICogQHBhcmFtIHthbnl9IHNjaGVtYSAtIFZhbGlkYXRpb24gc2NoZW1hXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBqc2RvYyAtIEpTRG9jIGNvbW1lbnRcblx0ICogQHJldHVybnMge29iamVjdH0gRW5oYW5jZWQgT3BlbkFQSSBwYXRoIGl0ZW1cblx0ICovXG5cdGdlbmVyYXRlUGF0aEl0ZW1XaXRoSlNEb2MobW9kdWxlTmFtZSwgZnVuY3Rpb25OYW1lLCBzY2hlbWEsIGpzZG9jKSB7XG5cdFx0Y29uc3QgcGF0aEl0ZW0gPSB0aGlzLmdlbmVyYXRlUGF0aEl0ZW0obW9kdWxlTmFtZSwgZnVuY3Rpb25OYW1lLCBzY2hlbWEpO1xuXG5cdFx0aWYgKGpzZG9jKSB7XG5cdFx0XHRjb25zdCBqc0RvY1BhcmFtcyA9IHBhcnNlSlNEb2NQYXJhbWV0ZXJzKGpzZG9jKTtcblxuXHRcdFx0Ly8gRXh0cmFjdCBkZXNjcmlwdGlvbiBmcm9tIEpTRG9jXG5cdFx0XHRjb25zdCBkZXNjcmlwdGlvbk1hdGNoID0ganNkb2MubWF0Y2goL1xcL1xcKlxcKlxccypcXG5cXHMqXFwqXFxzKihbXkBcXG5dKikvKTtcblx0XHRcdGlmIChkZXNjcmlwdGlvbk1hdGNoKSB7XG5cdFx0XHRcdHBhdGhJdGVtLnBvc3QuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbk1hdGNoWzFdLnRyaW0oKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRW5oYW5jZSByZXF1ZXN0IHNjaGVtYSB3aXRoIEpTRG9jIGluZm9ybWF0aW9uXG5cdFx0XHRpZiAoanNEb2NQYXJhbXMubGVuZ3RoID4gMCAmJiAhc2NoZW1hKSB7XG5cdFx0XHRcdHBhdGhJdGVtLnBvc3QucmVxdWVzdEJvZHkuY29udGVudFtcImFwcGxpY2F0aW9uL2pzb25cIl0uc2NoZW1hID0ge1xuXHRcdFx0XHRcdHR5cGU6IFwiYXJyYXlcIixcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJGdW5jdGlvbiBhcmd1bWVudHNcIixcblx0XHRcdFx0XHRpdGVtczogdGhpcy5nZW5lcmF0ZVNjaGVtYUZyb21KU0RvYyhqc0RvY1BhcmFtcyksXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBhdGhJdGVtO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdlbmVyYXRlIE9wZW5BUEkgc2NoZW1hIGZyb20gSlNEb2MgcGFyYW1ldGVyc1xuXHQgKiBAcGFyYW0ge0FycmF5fSBqc0RvY1BhcmFtcyAtIEpTRG9jIHBhcmFtZXRlciBkZXNjcmlwdGlvbnNcblx0ICogQHJldHVybnMge29iamVjdH0gT3BlbkFQSSBzY2hlbWFcblx0ICovXG5cdGdlbmVyYXRlU2NoZW1hRnJvbUpTRG9jKGpzRG9jUGFyYW1zKSB7XG5cdFx0aWYgKGpzRG9jUGFyYW1zLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0Ly8gU2luZ2xlIHBhcmFtZXRlclxuXHRcdFx0cmV0dXJuIHRoaXMuanNEb2NUeXBlVG9PcGVuQVBJU2NoZW1hKGpzRG9jUGFyYW1zWzBdKTtcblx0XHR9XG5cblx0XHQvLyBNdWx0aXBsZSBwYXJhbWV0ZXJzIC0gY3JlYXRlIG9iamVjdCBzY2hlbWFcblx0XHRjb25zdCBwcm9wZXJ0aWVzID0ge307XG5cdFx0Y29uc3QgcmVxdWlyZWQgPSBbXTtcblxuXHRcdGZvciAoY29uc3QgcGFyYW0gb2YganNEb2NQYXJhbXMpIHtcblx0XHRcdHByb3BlcnRpZXNbcGFyYW0ubmFtZV0gPSB0aGlzLmpzRG9jVHlwZVRvT3BlbkFQSVNjaGVtYShwYXJhbSk7XG5cdFx0XHRpZiAocGFyYW0ucmVxdWlyZWQpIHtcblx0XHRcdFx0cmVxdWlyZWQucHVzaChwYXJhbS5uYW1lKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogXCJvYmplY3RcIixcblx0XHRcdHByb3BlcnRpZXMsXG5cdFx0XHRyZXF1aXJlZDogcmVxdWlyZWQubGVuZ3RoID4gMCA/IHJlcXVpcmVkIDogdW5kZWZpbmVkLFxuXHRcdH07XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydCBKU0RvYyB0eXBlIHRvIE9wZW5BUEkgc2NoZW1hXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbSAtIEpTRG9jIHBhcmFtZXRlciBvYmplY3Rcblx0ICogQHJldHVybnMge29iamVjdH0gT3BlbkFQSSBzY2hlbWFcblx0ICovXG5cdGpzRG9jVHlwZVRvT3BlbkFQSVNjaGVtYShwYXJhbSkge1xuXHRcdGNvbnN0IHsgdHlwZSwgZGVzY3JpcHRpb24gfSA9IHBhcmFtO1xuXG5cdFx0c3dpdGNoICh0eXBlLnRvTG93ZXJDYXNlKCkpIHtcblx0XHRcdGNhc2UgXCJzdHJpbmdcIjpcblx0XHRcdFx0cmV0dXJuIHsgdHlwZTogXCJzdHJpbmdcIiwgZGVzY3JpcHRpb24gfTtcblx0XHRcdGNhc2UgXCJudW1iZXJcIjpcblx0XHRcdFx0cmV0dXJuIHsgdHlwZTogXCJudW1iZXJcIiwgZGVzY3JpcHRpb24gfTtcblx0XHRcdGNhc2UgXCJib29sZWFuXCI6XG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IFwiYm9vbGVhblwiLCBkZXNjcmlwdGlvbiB9O1xuXHRcdFx0Y2FzZSBcIm9iamVjdFwiOlxuXHRcdFx0XHRyZXR1cm4geyB0eXBlOiBcIm9iamVjdFwiLCBkZXNjcmlwdGlvbiB9O1xuXHRcdFx0Y2FzZSBcImFycmF5XCI6XG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IFwiYXJyYXlcIiwgaXRlbXM6IHsgdHlwZTogXCJvYmplY3RcIiB9LCBkZXNjcmlwdGlvbiB9O1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0Ly8gSGFuZGxlIHVuaW9uIHR5cGVzIGxpa2UgJ2xvdyd8J21lZGl1bSd8J2hpZ2gnXG5cdFx0XHRcdGlmICh0eXBlLmluY2x1ZGVzKFwifFwiKSkge1xuXHRcdFx0XHRcdGNvbnN0IGVudW1WYWx1ZXMgPSB0eXBlLnNwbGl0KFwifFwiKS5tYXAoKHYpID0+IHYucmVwbGFjZSgvWydcIl0vZywgXCJcIikudHJpbSgpKTtcblx0XHRcdFx0XHRyZXR1cm4geyB0eXBlOiBcInN0cmluZ1wiLCBlbnVtOiBlbnVtVmFsdWVzLCBkZXNjcmlwdGlvbiB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB7IHR5cGU6IFwib2JqZWN0XCIsIGRlc2NyaXB0aW9uIH07XG5cdFx0fVxuXHR9XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyYy9idWlsZC11dGlscy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyYy9idWlsZC11dGlscy5qc1wiO2ltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tIFwibW9kdWxlXCI7XG5pbXBvcnQgeyBwYXRoVG9GaWxlVVJMIH0gZnJvbSBcInVybFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuXG4vKipcbiAqIEV4dHJhY3Qgc2NoZW1hcyBmcm9tIHNlcnZlciBtb2R1bGVzIGR1cmluZyBidWlsZCB0aW1lXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleHRyYWN0U2NoZW1hcyhzZXJ2ZXJGdW5jdGlvbnMpIHtcblx0Y29uc3Qgc2NoZW1hcyA9IHt9O1xuXG5cdGZvciAoY29uc3QgW21vZHVsZU5hbWUsIHsgaWQsIGZ1bmN0aW9ucyB9XSBvZiBzZXJ2ZXJGdW5jdGlvbnMpIHtcblx0XHRzY2hlbWFzW21vZHVsZU5hbWVdID0ge307XG5cblx0XHR0cnkge1xuXHRcdFx0Ly8gSW1wb3J0IHRoZSBtb2R1bGUgdG8gZ2V0IHNjaGVtYXNcblx0XHRcdGNvbnN0IG1vZHVsZVVybCA9IHBhdGhUb0ZpbGVVUkwoaWQpLmhyZWY7XG5cdFx0XHRjb25zdCBtb2R1bGUgPSBhd2FpdCBpbXBvcnQobW9kdWxlVXJsKTtcblxuXHRcdFx0Ly8gRXh0cmFjdCBzY2hlbWFzIGZyb20gZXhwb3J0ZWQgZnVuY3Rpb25zXG5cdFx0XHRmb3IgKGNvbnN0IGZ1bmN0aW9uTmFtZSBvZiBmdW5jdGlvbnMpIHtcblx0XHRcdFx0aWYgKG1vZHVsZVtmdW5jdGlvbk5hbWVdICYmIG1vZHVsZVtmdW5jdGlvbk5hbWVdLnNjaGVtYSkge1xuXHRcdFx0XHRcdC8vIFdlIG5lZWQgdG8gc2VyaWFsaXplIHRoZSBab2Qgc2NoZW1hXG5cdFx0XHRcdFx0Ly8gRm9yIG5vdywgd2UnbGwgc3RvcmUgYSByZWZlcmVuY2UgdGhhdCBjYW4gYmUgaW1wb3J0ZWRcblx0XHRcdFx0XHRzY2hlbWFzW21vZHVsZU5hbWVdW2Z1bmN0aW9uTmFtZV0gPSB7XG5cdFx0XHRcdFx0XHRoYXNTY2hlbWE6IHRydWUsXG5cdFx0XHRcdFx0XHQvLyBXZSdsbCBuZWVkIHRvIGdlbmVyYXRlIGltcG9ydCBzdGF0ZW1lbnRzIGZvciB0aGVzZVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y29uc29sZS53YXJuKGBGYWlsZWQgdG8gZXh0cmFjdCBzY2hlbWFzIGZyb20gJHtpZH06ICR7ZXJyb3IubWVzc2FnZX1gKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gc2NoZW1hcztcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSB2YWxpZGF0aW9uIHNldHVwIGNvZGUgZm9yIHByb2R1Y3Rpb25cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVmFsaWRhdGlvbkNvZGUob3B0aW9ucywgc2VydmVyRnVuY3Rpb25zKSB7XG5cdGlmICghb3B0aW9ucy52YWxpZGF0aW9uPy5lbmFibGVkKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGltcG9ydHM6IFwiXCIsXG5cdFx0XHRzZXR1cDogXCJcIixcblx0XHRcdG1pZGRsZXdhcmVGYWN0b3J5OiBcIlwiLFxuXHRcdFx0dmFsaWRhdGlvblJ1bnRpbWU6IFwiXCIsXG5cdFx0fTtcblx0fVxuXG5cdC8vIFJlYWQgdGhlIHZhbGlkYXRpb24gcnVudGltZSBjb2RlIHRoYXQgd2lsbCBiZSBlbWJlZGRlZFxuXHRjb25zdCB2YWxpZGF0aW9uUnVudGltZVBhdGggPSBuZXcgVVJMKCcuL3ZhbGlkYXRpb24tcnVudGltZS5qcycsIGltcG9ydC5tZXRhLnVybCk7XG5cdGNvbnN0IHZhbGlkYXRpb25SdW50aW1lID0gYFxuLy8gRW1iZWRkZWQgdmFsaWRhdGlvbiBydW50aW1lXG4ke2F3YWl0IGZzLnJlYWRGaWxlKHZhbGlkYXRpb25SdW50aW1lUGF0aCwgJ3V0Zi04Jyl9XG5gO1xuXG5cdC8vIEdlbmVyYXRlIHNldHVwIGNvZGVcblx0Y29uc3Qgc2V0dXAgPSBgXG4vLyBTZXR1cCB2YWxpZGF0aW9uXG5jb25zdCBzY2hlbWFEaXNjb3ZlcnkgPSBuZXcgU2NoZW1hRGlzY292ZXJ5KCk7XG5jb25zdCB2YWxpZGF0aW9uTWlkZGxld2FyZSA9IGNyZWF0ZVZhbGlkYXRpb25NaWRkbGV3YXJlKHsgc2NoZW1hRGlzY292ZXJ5IH0pO1xuXG4vLyBSZWdpc3RlciBzY2hlbWFzIGZyb20gc2VydmVyIGFjdGlvbnNcbiR7QXJyYXkuZnJvbShzZXJ2ZXJGdW5jdGlvbnMuZW50cmllcygpKVxuXHQubWFwKChbbW9kdWxlTmFtZSwgeyBmdW5jdGlvbnMgfV0pID0+IHtcblx0XHRyZXR1cm4gZnVuY3Rpb25zXG5cdFx0XHQubWFwKFxuXHRcdFx0XHQoZm4pID0+IGBcbmlmIChzZXJ2ZXJBY3Rpb25zLiR7bW9kdWxlTmFtZX0uJHtmbn0uc2NoZW1hKSB7XG4gIHNjaGVtYURpc2NvdmVyeS5yZWdpc3RlclNjaGVtYSgnJHttb2R1bGVOYW1lfScsICcke2ZufScsIHNlcnZlckFjdGlvbnMuJHttb2R1bGVOYW1lfS4ke2ZufS5zY2hlbWEpO1xufWAsXG5cdFx0XHQpXG5cdFx0XHQuam9pbihcIlxcblwiKTtcblx0fSlcblx0LmpvaW4oXCJcXG5cIil9XG5gO1xuXG5cdC8vIEdlbmVyYXRlIG1pZGRsZXdhcmUgZmFjdG9yeVxuXHRjb25zdCBtaWRkbGV3YXJlRmFjdG9yeSA9IGBcbmZ1bmN0aW9uIGNyZWF0ZUNvbnRleHR1YWxWYWxpZGF0aW9uTWlkZGxld2FyZShtb2R1bGVOYW1lLCBmdW5jdGlvbk5hbWUpIHtcbiAgcmV0dXJuIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIHJlcS52YWxpZGF0aW9uQ29udGV4dCA9IHtcbiAgICAgIG1vZHVsZU5hbWUsXG4gICAgICBmdW5jdGlvbk5hbWUsXG4gICAgICBzY2hlbWE6IHNlcnZlckFjdGlvbnNbbW9kdWxlTmFtZV0/LltmdW5jdGlvbk5hbWVdPy5zY2hlbWFcbiAgICB9O1xuICAgIHJldHVybiB2YWxpZGF0aW9uTWlkZGxld2FyZShyZXEsIHJlcywgbmV4dCk7XG4gIH07XG59XG5gO1xuXG5cdHJldHVybiB7XG5cdFx0aW1wb3J0czogXCJcIixcblx0XHRzZXR1cCxcblx0XHRtaWRkbGV3YXJlRmFjdG9yeSxcblx0XHR2YWxpZGF0aW9uUnVudGltZSxcblx0fTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9oZWxnZS9jb2RlL3ZpdGUtc2VydmVyLWFjdGlvbnMvc3JjL2FzdC1wYXJzZXIuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvYXN0LXBhcnNlci5qc1wiO2ltcG9ydCB7IHBhcnNlIH0gZnJvbSAnQGJhYmVsL3BhcnNlcic7XG5pbXBvcnQgdHJhdmVyc2UgZnJvbSAnQGJhYmVsL3RyYXZlcnNlJztcblxuLyoqXG4gKiBFeHRyYWN0IGV4cG9ydGVkIGZ1bmN0aW9ucyBmcm9tIEphdmFTY3JpcHQvVHlwZVNjcmlwdCBjb2RlIHVzaW5nIEFTVCBwYXJzaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gY29kZSAtIFRoZSBzb3VyY2UgY29kZSB0byBwYXJzZVxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIGZpbGVuYW1lIChmb3IgYmV0dGVyIGVycm9yIG1lc3NhZ2VzKVxuICogQHJldHVybnMge0FycmF5PHtuYW1lOiBzdHJpbmcsIGlzQXN5bmM6IGJvb2xlYW4sIGlzRGVmYXVsdDogYm9vbGVhbiwgdHlwZTogc3RyaW5nLCBwYXJhbXM6IEFycmF5LCByZXR1cm5UeXBlOiBzdHJpbmd8bnVsbCwganNkb2M6IHN0cmluZ3xudWxsfT59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0RXhwb3J0ZWRGdW5jdGlvbnMoY29kZSwgZmlsZW5hbWUgPSAndW5rbm93bicpIHtcbiAgY29uc3QgZnVuY3Rpb25zID0gW107XG4gIFxuICB0cnkge1xuICAgIC8vIFBhcnNlIHRoZSBjb2RlIGludG8gYW4gQVNUXG4gICAgY29uc3QgYXN0ID0gcGFyc2UoY29kZSwge1xuICAgICAgc291cmNlVHlwZTogJ21vZHVsZScsXG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgICd0eXBlc2NyaXB0JyxcbiAgICAgICAgJ2pzeCcsXG4gICAgICAgICdkZWNvcmF0b3JzLWxlZ2FjeScsXG4gICAgICAgICdkeW5hbWljSW1wb3J0JyxcbiAgICAgICAgJ2V4cG9ydERlZmF1bHRGcm9tJyxcbiAgICAgICAgJ2V4cG9ydE5hbWVzcGFjZUZyb20nLFxuICAgICAgICAndG9wTGV2ZWxBd2FpdCcsXG4gICAgICAgICdjbGFzc1Byb3BlcnRpZXMnLFxuICAgICAgICAnY2xhc3NQcml2YXRlUHJvcGVydGllcycsXG4gICAgICAgICdjbGFzc1ByaXZhdGVNZXRob2RzJ1xuICAgICAgXVxuICAgIH0pO1xuXG4gICAgLy8gVHJhdmVyc2UgdGhlIEFTVCB0byBmaW5kIGV4cG9ydGVkIGZ1bmN0aW9uc1xuICAgIGNvbnN0IHRyYXZlcnNlRm4gPSB0cmF2ZXJzZS5kZWZhdWx0IHx8IHRyYXZlcnNlO1xuICAgIHRyYXZlcnNlRm4oYXN0LCB7XG4gICAgICAvLyBIYW5kbGU6IGV4cG9ydCBmdW5jdGlvbiBuYW1lKCkge30gb3IgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5hbWUoKSB7fVxuICAgICAgRXhwb3J0TmFtZWREZWNsYXJhdGlvbihwYXRoKSB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gcGF0aC5ub2RlLmRlY2xhcmF0aW9uO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uICYmIGRlY2xhcmF0aW9uLnR5cGUgPT09ICdGdW5jdGlvbkRlY2xhcmF0aW9uJykge1xuICAgICAgICAgIGlmIChkZWNsYXJhdGlvbi5pZCkge1xuICAgICAgICAgICAgZnVuY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiBkZWNsYXJhdGlvbi5pZC5uYW1lLFxuICAgICAgICAgICAgICBpc0FzeW5jOiBkZWNsYXJhdGlvbi5hc3luYyB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgaXNEZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBleHRyYWN0RGV0YWlsZWRQYXJhbXMoZGVjbGFyYXRpb24ucGFyYW1zKSxcbiAgICAgICAgICAgICAgcmV0dXJuVHlwZTogZXh0cmFjdFR5cGVBbm5vdGF0aW9uKGRlY2xhcmF0aW9uLnJldHVyblR5cGUpLFxuICAgICAgICAgICAgICBqc2RvYzogZXh0cmFjdEpTRG9jKHBhdGgubm9kZS5sZWFkaW5nQ29tbWVudHMpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZTogZXhwb3J0IGNvbnN0IG5hbWUgPSAoKSA9PiB7fSBvciBleHBvcnQgY29uc3QgbmFtZSA9IGFzeW5jICgpID0+IHt9XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiBkZWNsYXJhdGlvbi50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdGlvbicpIHtcbiAgICAgICAgICBkZWNsYXJhdGlvbi5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsID0+IHtcbiAgICAgICAgICAgIGlmIChkZWNsLmluaXQgJiYgKFxuICAgICAgICAgICAgICBkZWNsLmluaXQudHlwZSA9PT0gJ0Fycm93RnVuY3Rpb25FeHByZXNzaW9uJyB8fFxuICAgICAgICAgICAgICBkZWNsLmluaXQudHlwZSA9PT0gJ0Z1bmN0aW9uRXhwcmVzc2lvbidcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAgICAgZnVuY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IGRlY2wuaWQubmFtZSxcbiAgICAgICAgICAgICAgICBpc0FzeW5jOiBkZWNsLmluaXQuYXN5bmMgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNEZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnYXJyb3cnLFxuICAgICAgICAgICAgICAgIHBhcmFtczogZXh0cmFjdERldGFpbGVkUGFyYW1zKGRlY2wuaW5pdC5wYXJhbXMpLFxuICAgICAgICAgICAgICAgIHJldHVyblR5cGU6IGV4dHJhY3RUeXBlQW5ub3RhdGlvbihkZWNsLmluaXQucmV0dXJuVHlwZSksXG4gICAgICAgICAgICAgICAganNkb2M6IGV4dHJhY3RKU0RvYyhkZWNsYXJhdGlvbi5sZWFkaW5nQ29tbWVudHMpXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBIYW5kbGU6IGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge30gb3IgZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gbmFtZSgpIHt9XG4gICAgICBFeHBvcnREZWZhdWx0RGVjbGFyYXRpb24ocGF0aCkge1xuICAgICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHBhdGgubm9kZS5kZWNsYXJhdGlvbjtcbiAgICAgICAgXG4gICAgICAgIGlmIChkZWNsYXJhdGlvbi50eXBlID09PSAnRnVuY3Rpb25EZWNsYXJhdGlvbicpIHtcbiAgICAgICAgICBmdW5jdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBkZWNsYXJhdGlvbi5pZCA/IGRlY2xhcmF0aW9uLmlkLm5hbWUgOiAnZGVmYXVsdCcsXG4gICAgICAgICAgICBpc0FzeW5jOiBkZWNsYXJhdGlvbi5hc3luYyB8fCBmYWxzZSxcbiAgICAgICAgICAgIGlzRGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicsXG4gICAgICAgICAgICBwYXJhbXM6IGV4dHJhY3REZXRhaWxlZFBhcmFtcyhkZWNsYXJhdGlvbi5wYXJhbXMpLFxuICAgICAgICAgICAgcmV0dXJuVHlwZTogZXh0cmFjdFR5cGVBbm5vdGF0aW9uKGRlY2xhcmF0aW9uLnJldHVyblR5cGUpLFxuICAgICAgICAgICAganNkb2M6IGV4dHJhY3RKU0RvYyhwYXRoLm5vZGUubGVhZGluZ0NvbW1lbnRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGU6IGV4cG9ydCBkZWZhdWx0ICgpID0+IHt9IG9yIGV4cG9ydCBkZWZhdWx0IGFzeW5jICgpID0+IHt9XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbi50eXBlID09PSAnQXJyb3dGdW5jdGlvbkV4cHJlc3Npb24nIHx8IFxuICAgICAgICAgICAgZGVjbGFyYXRpb24udHlwZSA9PT0gJ0Z1bmN0aW9uRXhwcmVzc2lvbicpIHtcbiAgICAgICAgICBmdW5jdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiAnZGVmYXVsdCcsXG4gICAgICAgICAgICBpc0FzeW5jOiBkZWNsYXJhdGlvbi5hc3luYyB8fCBmYWxzZSxcbiAgICAgICAgICAgIGlzRGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICAgIHR5cGU6ICdhcnJvdycsXG4gICAgICAgICAgICBwYXJhbXM6IGV4dHJhY3REZXRhaWxlZFBhcmFtcyhkZWNsYXJhdGlvbi5wYXJhbXMpLFxuICAgICAgICAgICAgcmV0dXJuVHlwZTogZXh0cmFjdFR5cGVBbm5vdGF0aW9uKGRlY2xhcmF0aW9uLnJldHVyblR5cGUpLFxuICAgICAgICAgICAganNkb2M6IGV4dHJhY3RKU0RvYyhwYXRoLm5vZGUubGVhZGluZ0NvbW1lbnRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXG4gICAgICAvLyBIYW5kbGU6IGV4cG9ydCB7IGZ1bmN0aW9uTmFtZSB9IG9yIGV4cG9ydCB7IGludGVybmFsTmFtZSBhcyBwdWJsaWNOYW1lIH1cbiAgICAgIEV4cG9ydFNwZWNpZmllcihwYXRoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gdHJhY2sgdGhlc2UgYW5kIG1hdGNoIHRoZW0gd2l0aCBmdW5jdGlvbiBkZWNsYXJhdGlvbnNcbiAgICAgICAgY29uc3QgbG9jYWxOYW1lID0gcGF0aC5ub2RlLmxvY2FsLm5hbWU7XG4gICAgICAgIGNvbnN0IGV4cG9ydGVkTmFtZSA9IHBhdGgubm9kZS5leHBvcnRlZC5uYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3IgdGhlIGZ1bmN0aW9uIGluIHRoZSBtb2R1bGUgc2NvcGVcbiAgICAgICAgY29uc3QgYmluZGluZyA9IHBhdGguc2NvcGUuZ2V0QmluZGluZyhsb2NhbE5hbWUpO1xuICAgICAgICBpZiAoYmluZGluZyAmJiBiaW5kaW5nLnBhdGguaXNGdW5jdGlvbkRlY2xhcmF0aW9uKCkpIHtcbiAgICAgICAgICBmdW5jdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBuYW1lOiBleHBvcnRlZE5hbWUsXG4gICAgICAgICAgICBpc0FzeW5jOiBiaW5kaW5nLnBhdGgubm9kZS5hc3luYyB8fCBmYWxzZSxcbiAgICAgICAgICAgIGlzRGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgICB0eXBlOiAncmVuYW1lZCcsXG4gICAgICAgICAgICBwYXJhbXM6IGV4dHJhY3REZXRhaWxlZFBhcmFtcyhiaW5kaW5nLnBhdGgubm9kZS5wYXJhbXMpLFxuICAgICAgICAgICAgcmV0dXJuVHlwZTogZXh0cmFjdFR5cGVBbm5vdGF0aW9uKGJpbmRpbmcucGF0aC5ub2RlLnJldHVyblR5cGUpLFxuICAgICAgICAgICAganNkb2M6IGV4dHJhY3RKU0RvYyhiaW5kaW5nLnBhdGgubm9kZS5sZWFkaW5nQ29tbWVudHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSB2YXJpYWJsZSB3aXRoIGFycm93IGZ1bmN0aW9uXG4gICAgICAgIGlmIChiaW5kaW5nICYmIGJpbmRpbmcucGF0aC5pc1ZhcmlhYmxlRGVjbGFyYXRvcigpKSB7XG4gICAgICAgICAgY29uc3QgaW5pdCA9IGJpbmRpbmcucGF0aC5ub2RlLmluaXQ7XG4gICAgICAgICAgaWYgKGluaXQgJiYgKGluaXQudHlwZSA9PT0gJ0Fycm93RnVuY3Rpb25FeHByZXNzaW9uJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgaW5pdC50eXBlID09PSAnRnVuY3Rpb25FeHByZXNzaW9uJykpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgbmFtZTogZXhwb3J0ZWROYW1lLFxuICAgICAgICAgICAgICBpc0FzeW5jOiBpbml0LmFzeW5jIHx8IGZhbHNlLFxuICAgICAgICAgICAgICBpc0RlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgICB0eXBlOiAncmVuYW1lZC1hcnJvdycsXG4gICAgICAgICAgICAgIHBhcmFtczogZXh0cmFjdERldGFpbGVkUGFyYW1zKGluaXQucGFyYW1zKSxcbiAgICAgICAgICAgICAgcmV0dXJuVHlwZTogZXh0cmFjdFR5cGVBbm5vdGF0aW9uKGluaXQucmV0dXJuVHlwZSksXG4gICAgICAgICAgICAgIGpzZG9jOiBleHRyYWN0SlNEb2MoYmluZGluZy5wYXRoLm5vZGUubGVhZGluZ0NvbW1lbnRzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gcGFyc2UgJHtmaWxlbmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAvLyBSZXR1cm4gZW1wdHkgYXJyYXkgb24gcGFyc2UgZXJyb3IgcmF0aGVyIHRoYW4gdGhyb3dpbmdcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvLyBSZW1vdmUgZHVwbGljYXRlcyBhbmQgcmV0dXJuXG4gIGNvbnN0IHVuaXF1ZUZ1bmN0aW9ucyA9IEFycmF5LmZyb20obmV3IE1hcChcbiAgICBmdW5jdGlvbnMubWFwKGZuID0+IFtmbi5uYW1lLCBmbl0pXG4gICkudmFsdWVzKCkpO1xuICBcbiAgcmV0dXJuIHVuaXF1ZUZ1bmN0aW9ucztcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBpZiBhIGZ1bmN0aW9uIG5hbWUgaXMgdmFsaWQgSmF2YVNjcmlwdCBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIFRoZSBmdW5jdGlvbiBuYW1lIHRvIHZhbGlkYXRlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRGdW5jdGlvbk5hbWUobmFtZSkge1xuICAvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgSmF2YVNjcmlwdCBpZGVudGlmaWVyXG4gIHJldHVybiAvXlthLXpBLVpfJF1bYS16QS1aMC05XyRdKiQvLnRlc3QobmFtZSk7XG59XG5cbi8qKlxuICogRXh0cmFjdCBkZXRhaWxlZCBwYXJhbWV0ZXIgaW5mb3JtYXRpb24gZnJvbSBmdW5jdGlvbiBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJhbXMgLSBBcnJheSBvZiBwYXJhbWV0ZXIgQVNUIG5vZGVzXG4gKiBAcmV0dXJucyB7QXJyYXk8e25hbWU6IHN0cmluZywgdHlwZTogc3RyaW5nfG51bGwsIGRlZmF1bHRWYWx1ZTogc3RyaW5nfG51bGwsIGlzT3B0aW9uYWw6IGJvb2xlYW4sIGlzUmVzdDogYm9vbGVhbn0+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERldGFpbGVkUGFyYW1zKHBhcmFtcykge1xuICBpZiAoIXBhcmFtcykgcmV0dXJuIFtdO1xuICBcbiAgcmV0dXJuIHBhcmFtcy5tYXAocGFyYW0gPT4ge1xuICAgIGNvbnN0IHBhcmFtSW5mbyA9IHtcbiAgICAgIG5hbWU6ICcnLFxuICAgICAgdHlwZTogbnVsbCxcbiAgICAgIGRlZmF1bHRWYWx1ZTogbnVsbCxcbiAgICAgIGlzT3B0aW9uYWw6IGZhbHNlLFxuICAgICAgaXNSZXN0OiBmYWxzZVxuICAgIH07XG5cbiAgICBpZiAocGFyYW0udHlwZSA9PT0gJ0lkZW50aWZpZXInKSB7XG4gICAgICBwYXJhbUluZm8ubmFtZSA9IHBhcmFtLm5hbWU7XG4gICAgICBwYXJhbUluZm8udHlwZSA9IGV4dHJhY3RUeXBlQW5ub3RhdGlvbihwYXJhbS50eXBlQW5ub3RhdGlvbik7XG4gICAgICBwYXJhbUluZm8uaXNPcHRpb25hbCA9IHBhcmFtLm9wdGlvbmFsIHx8IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAocGFyYW0udHlwZSA9PT0gJ0Fzc2lnbm1lbnRQYXR0ZXJuJykge1xuICAgICAgLy8gSGFuZGxlIGRlZmF1bHQgcGFyYW1ldGVyczogZnVuY3Rpb24obmFtZSA9ICdkZWZhdWx0JylcbiAgICAgIHBhcmFtSW5mby5uYW1lID0gcGFyYW0ubGVmdC5uYW1lO1xuICAgICAgcGFyYW1JbmZvLnR5cGUgPSBleHRyYWN0VHlwZUFubm90YXRpb24ocGFyYW0ubGVmdC50eXBlQW5ub3RhdGlvbik7XG4gICAgICBwYXJhbUluZm8uZGVmYXVsdFZhbHVlID0gZ2VuZXJhdGVDb2RlKHBhcmFtLnJpZ2h0KTtcbiAgICAgIHBhcmFtSW5mby5pc09wdGlvbmFsID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtLnR5cGUgPT09ICdSZXN0RWxlbWVudCcpIHtcbiAgICAgIC8vIEhhbmRsZSByZXN0IHBhcmFtZXRlcnM6IGZ1bmN0aW9uKC4uLmFyZ3MpXG4gICAgICBwYXJhbUluZm8ubmFtZSA9IGAuLi4ke3BhcmFtLmFyZ3VtZW50Lm5hbWV9YDtcbiAgICAgIHBhcmFtSW5mby50eXBlID0gZXh0cmFjdFR5cGVBbm5vdGF0aW9uKHBhcmFtLnR5cGVBbm5vdGF0aW9uKTtcbiAgICAgIHBhcmFtSW5mby5pc1Jlc3QgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAocGFyYW0udHlwZSA9PT0gJ09iamVjdFBhdHRlcm4nKSB7XG4gICAgICAvLyBIYW5kbGUgZGVzdHJ1Y3R1cmluZzogZnVuY3Rpb24oe25hbWUsIGFnZX0pXG4gICAgICBwYXJhbUluZm8ubmFtZSA9IGdlbmVyYXRlQ29kZShwYXJhbSk7XG4gICAgICBwYXJhbUluZm8udHlwZSA9IGV4dHJhY3RUeXBlQW5ub3RhdGlvbihwYXJhbS50eXBlQW5ub3RhdGlvbik7XG4gICAgICBwYXJhbUluZm8uaXNPcHRpb25hbCA9IHBhcmFtLm9wdGlvbmFsIHx8IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAocGFyYW0udHlwZSA9PT0gJ0FycmF5UGF0dGVybicpIHtcbiAgICAgIC8vIEhhbmRsZSBhcnJheSBkZXN0cnVjdHVyaW5nOiBmdW5jdGlvbihbZmlyc3QsIHNlY29uZF0pXG4gICAgICBwYXJhbUluZm8ubmFtZSA9IGdlbmVyYXRlQ29kZShwYXJhbSk7XG4gICAgICBwYXJhbUluZm8udHlwZSA9IGV4dHJhY3RUeXBlQW5ub3RhdGlvbihwYXJhbS50eXBlQW5ub3RhdGlvbik7XG4gICAgICBwYXJhbUluZm8uaXNPcHRpb25hbCA9IHBhcmFtLm9wdGlvbmFsIHx8IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJhbUluZm87XG4gIH0pO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdHlwZSBhbm5vdGF0aW9uIGFzIHN0cmluZ1xuICogQHBhcmFtIHtvYmplY3R9IHR5cGVBbm5vdGF0aW9uIC0gVHlwZSBhbm5vdGF0aW9uIEFTVCBub2RlXG4gKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUFubm90YXRpb24odHlwZUFubm90YXRpb24pIHtcbiAgaWYgKCF0eXBlQW5ub3RhdGlvbiB8fCAhdHlwZUFubm90YXRpb24udHlwZUFubm90YXRpb24pIHJldHVybiBudWxsO1xuICBcbiAgcmV0dXJuIGdlbmVyYXRlQ29kZSh0eXBlQW5ub3RhdGlvbi50eXBlQW5ub3RhdGlvbik7XG59XG5cbi8qKlxuICogRXh0cmFjdCBKU0RvYyBjb21tZW50c1xuICogQHBhcmFtIHtBcnJheX0gY29tbWVudHMgLSBBcnJheSBvZiBjb21tZW50IG5vZGVzXG4gKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0SlNEb2MoY29tbWVudHMpIHtcbiAgaWYgKCFjb21tZW50cykgcmV0dXJuIG51bGw7XG4gIFxuICBjb25zdCBqc2RvY0NvbW1lbnQgPSBjb21tZW50cy5maW5kKGNvbW1lbnQgPT4gXG4gICAgY29tbWVudC50eXBlID09PSAnQ29tbWVudEJsb2NrJyAmJiBjb21tZW50LnZhbHVlLnN0YXJ0c1dpdGgoJyonKVxuICApO1xuICBcbiAgcmV0dXJuIGpzZG9jQ29tbWVudCA/IGAvKiR7anNkb2NDb21tZW50LnZhbHVlfSovYCA6IG51bGw7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgY29kZSBzdHJpbmcgZnJvbSBBU1Qgbm9kZSAoc2ltcGxpZmllZClcbiAqIEBwYXJhbSB7b2JqZWN0fSBub2RlIC0gQVNUIG5vZGVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlQ29kZShub2RlKSB7XG4gIGlmICghbm9kZSkgcmV0dXJuICcnO1xuICBcbiAgdHJ5IHtcbiAgICAvLyBTaW1wbGUgY29kZSBnZW5lcmF0aW9uIGZvciBjb21tb24gY2FzZXNcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgY2FzZSAnSWRlbnRpZmllcic6XG4gICAgICAgIHJldHVybiBub2RlLm5hbWU7XG4gICAgICBjYXNlICdTdHJpbmdMaXRlcmFsJzpcbiAgICAgICAgcmV0dXJuIGBcIiR7bm9kZS52YWx1ZX1cImA7XG4gICAgICBjYXNlICdOdW1lcmljTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiBTdHJpbmcobm9kZS52YWx1ZSk7XG4gICAgICBjYXNlICdCb29sZWFuTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiBTdHJpbmcobm9kZS52YWx1ZSk7XG4gICAgICBjYXNlICdOdWxsTGl0ZXJhbCc6XG4gICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgICBjYXNlICdUU1N0cmluZ0tleXdvcmQnOlxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgICBjYXNlICdUU051bWJlcktleXdvcmQnOlxuICAgICAgICByZXR1cm4gJ251bWJlcic7XG4gICAgICBjYXNlICdUU0Jvb2xlYW5LZXl3b3JkJzpcbiAgICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICAgIGNhc2UgJ1RTQW55S2V5d29yZCc6XG4gICAgICAgIHJldHVybiAnYW55JztcbiAgICAgIGNhc2UgJ1RTVW5rbm93bktleXdvcmQnOlxuICAgICAgICByZXR1cm4gJ3Vua25vd24nO1xuICAgICAgY2FzZSAnVFNWb2lkS2V5d29yZCc6XG4gICAgICAgIHJldHVybiAndm9pZCc7XG4gICAgICBjYXNlICdUU0FycmF5VHlwZSc6XG4gICAgICAgIHJldHVybiBgJHtnZW5lcmF0ZUNvZGUobm9kZS5lbGVtZW50VHlwZSl9W11gO1xuICAgICAgY2FzZSAnVFNVbmlvblR5cGUnOlxuICAgICAgICByZXR1cm4gbm9kZS50eXBlcy5tYXAodHlwZSA9PiBnZW5lcmF0ZUNvZGUodHlwZSkpLmpvaW4oJyB8ICcpO1xuICAgICAgY2FzZSAnVFNMaXRlcmFsVHlwZSc6XG4gICAgICAgIHJldHVybiBnZW5lcmF0ZUNvZGUobm9kZS5saXRlcmFsKTtcbiAgICAgIGNhc2UgJ09iamVjdFBhdHRlcm4nOlxuICAgICAgICBjb25zdCBwcm9wcyA9IG5vZGUucHJvcGVydGllcy5tYXAocHJvcCA9PiB7XG4gICAgICAgICAgaWYgKHByb3AudHlwZSA9PT0gJ09iamVjdFByb3BlcnR5Jykge1xuICAgICAgICAgICAgcmV0dXJuIHByb3Aua2V5Lm5hbWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChwcm9wLnR5cGUgPT09ICdSZXN0RWxlbWVudCcpIHtcbiAgICAgICAgICAgIHJldHVybiBgLi4uJHtwcm9wLmFyZ3VtZW50Lm5hbWV9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9KS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgIHJldHVybiBgeyR7cHJvcHMuam9pbignLCAnKX19YDtcbiAgICAgIGNhc2UgJ0FycmF5UGF0dGVybic6XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gbm9kZS5lbGVtZW50cy5tYXAoKGVsZW0sIGkpID0+IFxuICAgICAgICAgIGVsZW0gPyAoZWxlbS50eXBlID09PSAnSWRlbnRpZmllcicgPyBlbGVtLm5hbWUgOiBgXyR7aX1gKSA6IGBfJHtpfWBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGBbJHtlbGVtZW50cy5qb2luKCcsICcpfV1gO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIGNvbXBsZXggdHlwZXNcbiAgICAgICAgcmV0dXJuIG5vZGUudHlwZSB8fCAndW5rbm93bic7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiAndW5rbm93bic7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0IGZ1bmN0aW9uIHBhcmFtZXRlciBuYW1lcyBmcm9tIEFTVCAobGVnYWN5IGNvbXBhdGliaWxpdHkpXG4gKiBAcGFyYW0ge29iamVjdH0gZnVuY3Rpb25Ob2RlIC0gVGhlIGZ1bmN0aW9uIEFTVCBub2RlXG4gKiBAcmV0dXJucyB7QXJyYXk8c3RyaW5nPn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RGdW5jdGlvblBhcmFtcyhmdW5jdGlvbk5vZGUpIHtcbiAgcmV0dXJuIGV4dHJhY3REZXRhaWxlZFBhcmFtcyhmdW5jdGlvbk5vZGUucGFyYW1zKS5tYXAocGFyYW0gPT4gcGFyYW0ubmFtZSk7XG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyY1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvdHlwZS1nZW5lcmF0b3IuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvdHlwZS1nZW5lcmF0b3IuanNcIjsvKipcbiAqIFR5cGVTY3JpcHQgZGVmaW5pdGlvbiBnZW5lcmF0b3IgZm9yIHNlcnZlciBhY3Rpb25zXG4gKiBHZW5lcmF0ZXMgYWNjdXJhdGUgLmQudHMgZmlsZXMgd2l0aCBmdWxsIHR5cGUgaW5mb3JtYXRpb25cbiAqL1xuXG4vKipcbiAqIEdlbmVyYXRlIFR5cGVTY3JpcHQgZGVmaW5pdGlvbnMgZm9yIHNlcnZlciBhY3Rpb25zXG4gKiBAcGFyYW0ge01hcH0gc2VydmVyRnVuY3Rpb25zIC0gTWFwIG9mIG1vZHVsZSBuYW1lcyB0byBmdW5jdGlvbiBpbmZvXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIFR5cGVTY3JpcHQgZGVmaW5pdGlvbiBjb250ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVR5cGVEZWZpbml0aW9ucyhzZXJ2ZXJGdW5jdGlvbnMsIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgdHlwZURlZmluaXRpb25zID0gYC8vIEF1dG8tZ2VuZXJhdGVkIFR5cGVTY3JpcHQgZGVmaW5pdGlvbnMgZm9yIFZpdGUgU2VydmVyIEFjdGlvbnNcbi8vIFRoaXMgZmlsZSBpcyBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQgd2hlbiBzZXJ2ZXIgYWN0aW9ucyBjaGFuZ2VcblxuYDtcblxuICAvLyBBZGQgaW1wb3J0cyBmb3IgY29tbW9uIHR5cGVzXG4gIHR5cGVEZWZpbml0aW9ucyArPSBgdHlwZSBTZXJ2ZXJBY3Rpb25SZXN1bHQ8VD4gPSBQcm9taXNlPFQ+O1xudHlwZSBTZXJ2ZXJBY3Rpb25FcnJvciA9IHtcbiAgZXJyb3I6IGJvb2xlYW47XG4gIHN0YXR1czogbnVtYmVyO1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIGNvZGU/OiBzdHJpbmc7XG4gIGRldGFpbHM/OiBhbnk7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xufTtcblxuYDtcblxuICAvLyBHZW5lcmF0ZSB0eXBlcyBmb3IgZWFjaCBtb2R1bGVcbiAgZm9yIChjb25zdCBbbW9kdWxlTmFtZSwgbW9kdWxlSW5mb10gb2Ygc2VydmVyRnVuY3Rpb25zKSB7XG4gICAgdHlwZURlZmluaXRpb25zICs9IGdlbmVyYXRlTW9kdWxlVHlwZXMobW9kdWxlTmFtZSwgbW9kdWxlSW5mbyk7XG4gIH1cblxuICAvLyBHZW5lcmF0ZSBhIGdsb2JhbCBpbnRlcmZhY2UgdGhhdCBjb21iaW5lcyBhbGwgc2VydmVyIGFjdGlvbnNcbiAgdHlwZURlZmluaXRpb25zICs9IGdlbmVyYXRlR2xvYmFsSW50ZXJmYWNlKHNlcnZlckZ1bmN0aW9ucyk7XG5cbiAgcmV0dXJuIHR5cGVEZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBUeXBlU2NyaXB0IHR5cGVzIGZvciBhIHNwZWNpZmljIG1vZHVsZVxuICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBNb2R1bGUgbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IG1vZHVsZUluZm8gLSBNb2R1bGUgaW5mb3JtYXRpb24gd2l0aCBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlTW9kdWxlVHlwZXMobW9kdWxlTmFtZSwgbW9kdWxlSW5mbykge1xuICBjb25zdCB7IGZ1bmN0aW9ucywgZmlsZVBhdGgsIGZ1bmN0aW9uRGV0YWlscyA9IFtdIH0gPSBtb2R1bGVJbmZvO1xuICBcbiAgbGV0IG1vZHVsZVR5cGVzID0gYC8vIFR5cGVzIGZvciAke2ZpbGVQYXRofVxcbmA7XG4gIG1vZHVsZVR5cGVzICs9IGBkZWNsYXJlIG1vZHVsZSBcIiR7ZmlsZVBhdGh9XCIge1xcbmA7XG5cbiAgZnVuY3Rpb25EZXRhaWxzLmZvckVhY2goZnVuYyA9PiB7XG4gICAgY29uc3Qgc2lnbmF0dXJlID0gZ2VuZXJhdGVGdW5jdGlvblNpZ25hdHVyZShmdW5jKTtcbiAgICBjb25zdCBqc2RvY0NvbW1lbnQgPSBmdW5jLmpzZG9jID8gZm9ybWF0SlNEb2NGb3JUUyhmdW5jLmpzZG9jKSA6ICcnO1xuICAgIFxuICAgIG1vZHVsZVR5cGVzICs9IGAke2pzZG9jQ29tbWVudH0gIGV4cG9ydCAke3NpZ25hdHVyZX07XFxuYDtcbiAgfSk7XG5cbiAgbW9kdWxlVHlwZXMgKz0gYH1cXG5cXG5gO1xuICBcbiAgcmV0dXJuIG1vZHVsZVR5cGVzO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGZ1bmN0aW9uIHNpZ25hdHVyZSB3aXRoIHByb3BlciBUeXBlU2NyaXB0IHN5bnRheFxuICogQHBhcmFtIHtPYmplY3R9IGZ1bmMgLSBGdW5jdGlvbiBpbmZvcm1hdGlvblxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVGdW5jdGlvblNpZ25hdHVyZShmdW5jKSB7XG4gIGNvbnN0IHsgbmFtZSwgaXNBc3luYywgcGFyYW1zLCByZXR1cm5UeXBlIH0gPSBmdW5jO1xuICBcbiAgLy8gR2VuZXJhdGUgcGFyYW1ldGVyIGxpc3RcbiAgY29uc3QgcGFyYW1MaXN0ID0gcGFyYW1zLm1hcChwYXJhbSA9PiB7XG4gICAgbGV0IHBhcmFtU3RyID0gcGFyYW0ubmFtZTtcbiAgICBcbiAgICAvLyBBZGQgdHlwZSBhbm5vdGF0aW9uXG4gICAgaWYgKHBhcmFtLnR5cGUpIHtcbiAgICAgIHBhcmFtU3RyICs9IGA6ICR7cGFyYW0udHlwZX1gO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJhbVN0ciArPSBgOiBhbnlgOyAvLyBGYWxsYmFjayBmb3IgdW50eXBlZCBwYXJhbWV0ZXJzXG4gICAgfVxuICAgIFxuICAgIC8vIEhhbmRsZSBvcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgaWYgKHBhcmFtLmlzT3B0aW9uYWwgJiYgIXBhcmFtLm5hbWUuaW5jbHVkZXMoJy4uLicpKSB7XG4gICAgICAvLyBJbnNlcnQgPyBiZWZvcmUgdGhlIHR5cGUgYW5ub3RhdGlvblxuICAgICAgcGFyYW1TdHIgPSBwYXJhbVN0ci5yZXBsYWNlKCc6JywgJz86Jyk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwYXJhbVN0cjtcbiAgfSkuam9pbignLCAnKTtcblxuICAvLyBEZXRlcm1pbmUgcmV0dXJuIHR5cGVcbiAgbGV0IHJlc3VsdFR5cGUgPSByZXR1cm5UeXBlIHx8ICdhbnknO1xuICBpZiAoaXNBc3luYykge1xuICAgIHJlc3VsdFR5cGUgPSBgUHJvbWlzZTwke3Jlc3VsdFR5cGV9PmA7XG4gIH1cblxuICByZXR1cm4gYGZ1bmN0aW9uICR7bmFtZX0oJHtwYXJhbUxpc3R9KTogJHtyZXN1bHRUeXBlfWA7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgSmF2YVNjcmlwdCBmdW5jdGlvbiBzaWduYXR1cmUgKHdpdGhvdXQgVHlwZVNjcmlwdCB0eXBlcylcbiAqIEBwYXJhbSB7T2JqZWN0fSBmdW5jIC0gRnVuY3Rpb24gaW5mb3JtYXRpb25cbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlSmF2YVNjcmlwdFNpZ25hdHVyZShmdW5jKSB7XG4gIGNvbnN0IHsgbmFtZSwgcGFyYW1zIH0gPSBmdW5jO1xuICBcbiAgLy8gR2VuZXJhdGUgcGFyYW1ldGVyIGxpc3Qgd2l0aG91dCBUeXBlU2NyaXB0IHR5cGVzXG4gIGNvbnN0IHBhcmFtTGlzdCA9IHBhcmFtcy5tYXAocGFyYW0gPT4ge1xuICAgIGxldCBwYXJhbVN0ciA9IHBhcmFtLm5hbWU7XG4gICAgXG4gICAgLy8gRm9yIEphdmFTY3JpcHQsIHdlIG9ubHkgbmVlZCB0aGUgcGFyYW1ldGVyIG5hbWVcbiAgICAvLyBPcHRpb25hbCBhbmQgcmVzdCBwYXJhbWV0ZXJzIGFyZSBoYW5kbGVkIG5hdHVyYWxseVxuICAgIFxuICAgIHJldHVybiBwYXJhbVN0cjtcbiAgfSkuam9pbignLCAnKTtcblxuICByZXR1cm4gYGZ1bmN0aW9uICR7bmFtZX0oJHtwYXJhbUxpc3R9KWA7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBnbG9iYWwgaW50ZXJmYWNlIHRoYXQgY29tYmluZXMgYWxsIHNlcnZlciBhY3Rpb25zXG4gKiBAcGFyYW0ge01hcH0gc2VydmVyRnVuY3Rpb25zIC0gQWxsIHNlcnZlciBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlR2xvYmFsSW50ZXJmYWNlKHNlcnZlckZ1bmN0aW9ucykge1xuICBsZXQgZ2xvYmFsSW50ZXJmYWNlID0gYC8vIEdsb2JhbCBzZXJ2ZXIgYWN0aW9ucyBpbnRlcmZhY2VcbmRlY2xhcmUgZ2xvYmFsIHtcbiAgbmFtZXNwYWNlIFNlcnZlckFjdGlvbnMge1xuYDtcblxuICBmb3IgKGNvbnN0IFttb2R1bGVOYW1lLCBtb2R1bGVJbmZvXSBvZiBzZXJ2ZXJGdW5jdGlvbnMpIHtcbiAgICBjb25zdCB7IGZ1bmN0aW9uRGV0YWlscyA9IFtdIH0gPSBtb2R1bGVJbmZvO1xuICAgIFxuICAgIGdsb2JhbEludGVyZmFjZSArPSBgICAgIG5hbWVzcGFjZSAke2NhcGl0YWxpemVGaXJzdChtb2R1bGVOYW1lKX0ge1xcbmA7XG4gICAgXG4gICAgZnVuY3Rpb25EZXRhaWxzLmZvckVhY2goZnVuYyA9PiB7XG4gICAgICBjb25zdCBzaWduYXR1cmUgPSBnZW5lcmF0ZUZ1bmN0aW9uU2lnbmF0dXJlKGZ1bmMpO1xuICAgICAgY29uc3QganNkb2NDb21tZW50ID0gZnVuYy5qc2RvYyA/IGZvcm1hdEpTRG9jRm9yVFMoZnVuYy5qc2RvYywgJyAgICAgICcpIDogJyc7XG4gICAgICBcbiAgICAgIGdsb2JhbEludGVyZmFjZSArPSBgJHtqc2RvY0NvbW1lbnR9ICAgICAgJHtzaWduYXR1cmV9O1xcbmA7XG4gICAgfSk7XG4gICAgXG4gICAgZ2xvYmFsSW50ZXJmYWNlICs9IGAgICAgfVxcbmA7XG4gIH1cblxuICBnbG9iYWxJbnRlcmZhY2UgKz0gYCAgfVxufVxuXG5leHBvcnQge307XG5gO1xuXG4gIHJldHVybiBnbG9iYWxJbnRlcmZhY2U7XG59XG5cbi8qKlxuICogRm9ybWF0IEpTRG9jIGNvbW1lbnRzIGZvciBUeXBlU2NyaXB0XG4gKiBAcGFyYW0ge3N0cmluZ30ganNkb2MgLSBSYXcgSlNEb2MgY29tbWVudFxuICogQHBhcmFtIHtzdHJpbmd9IGluZGVudCAtIEluZGVudGF0aW9uIHByZWZpeFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZm9ybWF0SlNEb2NGb3JUUyhqc2RvYywgaW5kZW50ID0gJyAgJykge1xuICBpZiAoIWpzZG9jKSByZXR1cm4gJyc7XG4gIFxuICAvLyBDbGVhbiB1cCB0aGUgSlNEb2MgY29tbWVudCBhbmQgYWRkIHByb3BlciBpbmRlbnRhdGlvblxuICBjb25zdCBsaW5lcyA9IGpzZG9jLnNwbGl0KCdcXG4nKTtcbiAgY29uc3QgZm9ybWF0dGVkTGluZXMgPSBsaW5lcy5tYXAobGluZSA9PiBgJHtpbmRlbnR9JHtsaW5lLnRyaW0oKX1gKTtcbiAgXG4gIHJldHVybiBmb3JtYXR0ZWRMaW5lcy5qb2luKCdcXG4nKSArICdcXG4nO1xufVxuXG4vKipcbiAqIENhcGl0YWxpemUgZmlyc3QgbGV0dGVyIG9mIGEgc3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIC0gSW5wdXQgc3RyaW5nXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBjYXBpdGFsaXplRmlyc3Qoc3RyKSB7XG4gIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG59XG5cbi8qKlxuICogR2VuZXJhdGUgZW5oYW5jZWQgY2xpZW50IHByb3h5IHdpdGggYmV0dGVyIFR5cGVTY3JpcHQgc3VwcG9ydFxuICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBNb2R1bGUgbmFtZVxuICogQHBhcmFtIHtBcnJheX0gZnVuY3Rpb25EZXRhaWxzIC0gRGV0YWlsZWQgZnVuY3Rpb24gaW5mb3JtYXRpb25cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gUGx1Z2luIG9wdGlvbnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFJlbGF0aXZlIGZpbGUgcGF0aFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlRW5oYW5jZWRDbGllbnRQcm94eShtb2R1bGVOYW1lLCBmdW5jdGlvbkRldGFpbHMsIG9wdGlvbnMsIGZpbGVQYXRoKSB7XG4gIGNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09IFwicHJvZHVjdGlvblwiO1xuICBcbiAgbGV0IGNsaWVudFByb3h5ID0gYFxcbi8vIHZpdGUtc2VydmVyLWFjdGlvbnM6ICR7bW9kdWxlTmFtZX1cXG5gO1xuICBcbiAgLy8gQWRkIFR5cGVTY3JpcHQgdHlwZXMgaWYgd2UgaGF2ZSBkZXRhaWxlZCBpbmZvcm1hdGlvblxuICBpZiAoZnVuY3Rpb25EZXRhaWxzLmxlbmd0aCA+IDApIHtcbiAgICBjbGllbnRQcm94eSArPSBgLy8gQXV0by1nZW5lcmF0ZWQgdHlwZXMgZm9yICR7ZmlsZVBhdGh9XFxuYDtcbiAgICBcbiAgICBmdW5jdGlvbkRldGFpbHMuZm9yRWFjaChmdW5jID0+IHtcbiAgICAgIGlmIChmdW5jLmpzZG9jKSB7XG4gICAgICAgIGNsaWVudFByb3h5ICs9IGAke2Z1bmMuanNkb2N9XFxuYDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIEFkZCBkZXZlbG9wbWVudCBzYWZldHkgY2hlY2tzXG4gIGlmIChpc0Rldikge1xuICAgIGNsaWVudFByb3h5ICs9IGBcbi8vIERldmVsb3BtZW50LW9ubHkgc2FmZXR5IGNoZWNrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgY29uc3Qgc2VydmVyRmlsZUVycm9yID0gbmV3IEVycm9yKFxuICAgICdbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gU0VDVVJJVFkgV0FSTklORzogU2VydmVyIGZpbGUgXCIke21vZHVsZU5hbWV9XCIgaXMgYmVpbmcgaW1wb3J0ZWQgaW4gY2xpZW50IGNvZGUhICcgK1xuICAgICdUaGlzIGNvdWxkIGV4cG9zZSBzZXJ2ZXItc2lkZSBjb2RlIHRvIHRoZSBicm93c2VyLiBPbmx5IGltcG9ydCBzZXJ2ZXIgYWN0aW9ucyB0aHJvdWdoIHRoZSBwbHVnaW4uJ1xuICApO1xuICBzZXJ2ZXJGaWxlRXJyb3IubmFtZSA9ICdTZXJ2ZXJDb2RlSW5DbGllbnRFcnJvcic7XG4gIFxuICBpZiAoIXdpbmRvdy5fX1ZJVEVfU0VSVkVSX0FDVElPTlNfUFJPWFlfXykge1xuICAgIGNvbnNvbGUuZXJyb3Ioc2VydmVyRmlsZUVycm9yKTtcbiAgICBjb25zb2xlLmVycm9yKCdTdGFjayB0cmFjZTonLCBzZXJ2ZXJGaWxlRXJyb3Iuc3RhY2spO1xuICB9XG59XG5gO1xuICB9XG5cbiAgLy8gR2VuZXJhdGUgZnVuY3Rpb25zIHdpdGggZW5oYW5jZWQgdHlwZSBpbmZvcm1hdGlvblxuICBmdW5jdGlvbkRldGFpbHMuZm9yRWFjaCgoZnVuYykgPT4ge1xuICAgIGNvbnN0IHJvdXRlUGF0aCA9IG9wdGlvbnMucm91dGVUcmFuc2Zvcm0oZmlsZVBhdGgsIGZ1bmMubmFtZSk7XG4gICAgLy8gR2VuZXJhdGUgSmF2YVNjcmlwdCBzaWduYXR1cmUgKHdpdGhvdXQgVHlwZVNjcmlwdCB0eXBlcylcbiAgICBjb25zdCBqc1NpZ25hdHVyZSA9IGdlbmVyYXRlSmF2YVNjcmlwdFNpZ25hdHVyZShmdW5jKTtcbiAgICBcbiAgICBjbGllbnRQcm94eSArPSBgXG4ke2Z1bmMuanNkb2MgfHwgYC8qKlxuICogU2VydmVyIGFjdGlvbjogJHtmdW5jLm5hbWV9XG4gKi9gfVxuZXhwb3J0IGFzeW5jICR7anNTaWduYXR1cmV9IHtcbiAgY29uc29sZS5sb2coXCJbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gXHVEODNEXHVERTgwIC0gRXhlY3V0aW5nICR7ZnVuYy5uYW1lfVwiKTtcbiAgXG4gICR7aXNEZXYgPyBgXG4gIC8vIERldmVsb3BtZW50LW9ubHk6IE1hcmsgdGhhdCB3ZSdyZSBpbiBhIHZhbGlkIHByb3h5IGNvbnRleHRcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgd2luZG93Ll9fVklURV9TRVJWRVJfQUNUSU9OU19QUk9YWV9fID0gdHJ1ZTtcbiAgfVxuICBcbiAgLy8gVmFsaWRhdGUgYXJndW1lbnRzIGluIGRldmVsb3BtZW50XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5mcm9tKGFyZ3VtZW50cyk7XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIGZ1bmN0aW9uc1xuICAgIGlmIChhcmdzLnNvbWUoYXJnID0+IHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICdbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gV2FybmluZzogRnVuY3Rpb25zIGNhbm5vdCBiZSBzZXJpYWxpemVkIGFuZCBzZW50IHRvIHRoZSBzZXJ2ZXIuICcgK1xuICAgICAgICAnRnVuY3Rpb24gYXJndW1lbnRzIHdpbGwgYmUgY29udmVydGVkIHRvIG51bGwuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgYXJndW1lbnQgY291bnRcbiAgICBjb25zdCByZXF1aXJlZFBhcmFtcyA9ICR7SlNPTi5zdHJpbmdpZnkoZnVuYy5wYXJhbXMuZmlsdGVyKHAgPT4gIXAuaXNPcHRpb25hbCAmJiAhcC5pc1Jlc3QpKX07XG4gICAgY29uc3QgbWF4UGFyYW1zID0gJHtmdW5jLnBhcmFtcy5maWx0ZXIocCA9PiAhcC5pc1Jlc3QpLmxlbmd0aH07XG4gICAgY29uc3QgaGFzUmVzdCA9ICR7ZnVuYy5wYXJhbXMuc29tZShwID0+IHAuaXNSZXN0KX07XG4gICAgXG4gICAgaWYgKGFyZ3MubGVuZ3RoIDwgcmVxdWlyZWRQYXJhbXMubGVuZ3RoKSB7XG4gICAgICBjb25zb2xlLndhcm4oXFxgW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFdhcm5pbmc6IEZ1bmN0aW9uICcke2Z1bmMubmFtZX0nIGV4cGVjdHMgYXQgbGVhc3QgXFwke3JlcXVpcmVkUGFyYW1zLmxlbmd0aH0gYXJndW1lbnRzLCBnb3QgXFwke2FyZ3MubGVuZ3RofVxcYCk7XG4gICAgfVxuICAgIFxuICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heFBhcmFtcyAmJiAhaGFzUmVzdCkge1xuICAgICAgY29uc29sZS53YXJuKFxcYFtWaXRlIFNlcnZlciBBY3Rpb25zXSBXYXJuaW5nOiBGdW5jdGlvbiAnJHtmdW5jLm5hbWV9JyBleHBlY3RzIGF0IG1vc3QgXFwke21heFBhcmFtc30gYXJndW1lbnRzLCBnb3QgXFwke2FyZ3MubGVuZ3RofVxcYCk7XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIGZvciBub24tc2VyaWFsaXphYmxlIHR5cGVzXG4gICAgYXJncy5mb3JFYWNoKChhcmcsIGluZGV4KSA9PiB7XG4gICAgICBpZiAoYXJnIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXFxgW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFdhcm5pbmc6IEFyZ3VtZW50IFxcJHtpbmRleCArIDF9IGlzIGEgRGF0ZSBvYmplY3QuIENvbnNpZGVyIHBhc3NpbmcgYXMgSVNPIHN0cmluZzogXFwke2FyZy50b0lTT1N0cmluZygpfVxcYCk7XG4gICAgICB9IGVsc2UgaWYgKGFyZyBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXFxgW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFdhcm5pbmc6IEFyZ3VtZW50IFxcJHtpbmRleCArIDF9IGlzIGEgUmVnRXhwIGFuZCBjYW5ub3QgYmUgc2VyaWFsaXplZCBwcm9wZXJseVxcYCk7XG4gICAgICB9IGVsc2UgaWYgKGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcuY29uc3RydWN0b3IgIT09IE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcXGBbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gV2FybmluZzogQXJndW1lbnQgXFwke2luZGV4ICsgMX0gaXMgYSBjdXN0b20gb2JqZWN0IGluc3RhbmNlIHRoYXQgbWF5IG5vdCBzZXJpYWxpemUgcHJvcGVybHlcXGApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGAgOiAnJ31cbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnJHtvcHRpb25zLmFwaVByZWZpeH0vJHtyb3V0ZVBhdGh9Jywge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KEFycmF5LmZyb20oYXJndW1lbnRzKSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGxldCBlcnJvckRhdGE7XG4gICAgICB0cnkge1xuICAgICAgICBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgZXJyb3JEYXRhID0geyBcbiAgICAgICAgICBlcnJvcjogdHJ1ZSxcbiAgICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHBhcnNlIGVycm9yIHJlc3BvbnNlJyxcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zb2xlLmVycm9yKFwiW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFx1Mjc1NyAtIEVycm9yIGluICR7ZnVuYy5uYW1lfTpcIiwgZXJyb3JEYXRhKTtcbiAgICAgIFxuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3JEYXRhLm1lc3NhZ2UgfHwgJ1NlcnZlciByZXF1ZXN0IGZhaWxlZCcpO1xuICAgICAgT2JqZWN0LmFzc2lnbihlcnJvciwgZXJyb3JEYXRhKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFx1MjcwNSAtICR7ZnVuYy5uYW1lfSBleGVjdXRlZCBzdWNjZXNzZnVsbHlcIik7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIFxuICAgICR7aXNEZXYgPyBgXG4gICAgLy8gRGV2ZWxvcG1lbnQtb25seTogQ2xlYXIgdGhlIHByb3h5IGNvbnRleHRcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHdpbmRvdy5fX1ZJVEVfU0VSVkVSX0FDVElPTlNfUFJPWFlfXyA9IGZhbHNlO1xuICAgIH1cbiAgICBgIDogJyd9XG4gICAgXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW1ZpdGUgU2VydmVyIEFjdGlvbnNdIFx1Mjc1NyAtIE5ldHdvcmsgb3IgZXhlY3V0aW9uIGVycm9yIGluICR7ZnVuYy5uYW1lfTpcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgXG4gICAgJHtpc0RldiA/IGBcbiAgICAvLyBEZXZlbG9wbWVudC1vbmx5OiBDbGVhciB0aGUgcHJveHkgY29udGV4dCBvbiBlcnJvclxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgd2luZG93Ll9fVklURV9TRVJWRVJfQUNUSU9OU19QUk9YWV9fID0gZmFsc2U7XG4gICAgfVxuICAgIGAgOiAnJ31cbiAgICBcbiAgICAvLyBSZS10aHJvdyB3aXRoIG1vcmUgY29udGV4dCBpZiBpdCdzIG5vdCBhbHJlYWR5IG91ciBjdXN0b20gZXJyb3JcbiAgICBpZiAoIWVycm9yLnN0YXR1cykge1xuICAgICAgY29uc3QgbmV0d29ya0Vycm9yID0gbmV3IEVycm9yKFxcYEZhaWxlZCB0byBleGVjdXRlIHNlcnZlciBhY3Rpb24gJ1xcJHtmdW5jLm5hbWV9JzogXFwke2Vycm9yLm1lc3NhZ2V9XFxgKTtcbiAgICAgIG5ldHdvcmtFcnJvci5vcmlnaW5hbEVycm9yID0gZXJyb3I7XG4gICAgICB0aHJvdyBuZXR3b3JrRXJyb3I7XG4gICAgfVxuICAgIFxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5gO1xuICB9KTtcblxuICByZXR1cm4gY2xpZW50UHJveHk7XG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyY1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvZXJyb3ItZW5oYW5jZXIuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvZXJyb3ItZW5oYW5jZXIuanNcIjsvKipcbiAqIEVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIHdpdGggY29udGV4dCBhbmQgc3VnZ2VzdGlvbnNcbiAqIFByb3ZpZGVzIGRldmVsb3Blci1mcmllbmRseSBlcnJvciBtZXNzYWdlcyB3aXRoIGFjdGlvbmFibGUgc3VnZ2VzdGlvbnNcbiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhbiBlbmhhbmNlZCBlcnJvciBtZXNzYWdlIHdpdGggY29udGV4dCBhbmQgc3VnZ2VzdGlvbnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBlcnJvclR5cGUgLSBUeXBlIG9mIGVycm9yXG4gKiBAcGFyYW0ge3N0cmluZ30gb3JpZ2luYWxNZXNzYWdlIC0gT3JpZ2luYWwgZXJyb3IgbWVzc2FnZVxuICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgLSBFcnJvciBjb250ZXh0IGluZm9ybWF0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW5oYW5jZWRFcnJvcihlcnJvclR5cGUsIG9yaWdpbmFsTWVzc2FnZSwgY29udGV4dCA9IHt9KSB7XG4gIGNvbnN0IHsgZmlsZVBhdGgsIGZ1bmN0aW9uTmFtZSwgYXZhaWxhYmxlRnVuY3Rpb25zLCBzdWdnZXN0aW9uIH0gPSBjb250ZXh0O1xuICBcbiAgbGV0IGVuaGFuY2VkTWVzc2FnZSA9IGBbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gJHtlcnJvclR5cGV9OiAke29yaWdpbmFsTWVzc2FnZX1gO1xuICBcbiAgaWYgKGZpbGVQYXRoKSB7XG4gICAgZW5oYW5jZWRNZXNzYWdlICs9IGBcXG4gIFx1RDgzRFx1RENDMSBGaWxlOiAke2ZpbGVQYXRofWA7XG4gIH1cbiAgXG4gIGlmIChmdW5jdGlvbk5hbWUpIHtcbiAgICBlbmhhbmNlZE1lc3NhZ2UgKz0gYFxcbiAgXHVEODNEXHVERDI3IEZ1bmN0aW9uOiAke2Z1bmN0aW9uTmFtZX1gO1xuICB9XG4gIFxuICBpZiAoYXZhaWxhYmxlRnVuY3Rpb25zICYmIGF2YWlsYWJsZUZ1bmN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgZW5oYW5jZWRNZXNzYWdlICs9IGBcXG4gIFx1RDgzRFx1RENDQiBBdmFpbGFibGUgZnVuY3Rpb25zOiAke2F2YWlsYWJsZUZ1bmN0aW9ucy5qb2luKCcsICcpfWA7XG4gIH1cbiAgXG4gIGlmIChzdWdnZXN0aW9uKSB7XG4gICAgZW5oYW5jZWRNZXNzYWdlICs9IGBcXG4gIFx1RDgzRFx1RENBMSBTdWdnZXN0aW9uOiAke3N1Z2dlc3Rpb259YDtcbiAgfVxuICBcbiAgcmV0dXJuIGVuaGFuY2VkTWVzc2FnZTtcbn1cblxuLyoqXG4gKiBFbmhhbmNlIGZ1bmN0aW9uIG5vdCBmb3VuZCBlcnJvcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmdW5jdGlvbk5hbWUgLSBUaGUgZnVuY3Rpb24gdGhhdCB3YXNuJ3QgZm91bmRcbiAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gTW9kdWxlIHdoZXJlIGZ1bmN0aW9uIHdhcyBleHBlY3RlZFxuICogQHBhcmFtIHtBcnJheX0gYXZhaWxhYmxlRnVuY3Rpb25zIC0gTGlzdCBvZiBhdmFpbGFibGUgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5oYW5jZUZ1bmN0aW9uTm90Rm91bmRFcnJvcihmdW5jdGlvbk5hbWUsIG1vZHVsZU5hbWUsIGF2YWlsYWJsZUZ1bmN0aW9ucyA9IFtdKSB7XG4gIGNvbnN0IHN1Z2dlc3Rpb25zID0gW107XG4gIFxuICAvLyBDaGVjayBmb3Igc2ltaWxhciBmdW5jdGlvbiBuYW1lcyAodHlwb3MpXG4gIGNvbnN0IHNpbWlsYXJGdW5jdGlvbnMgPSBhdmFpbGFibGVGdW5jdGlvbnMuZmlsdGVyKGZuID0+IFxuICAgIGxldmVuc2h0ZWluRGlzdGFuY2UoZm4sIGZ1bmN0aW9uTmFtZSkgPD0gMlxuICApO1xuICBcbiAgaWYgKHNpbWlsYXJGdW5jdGlvbnMubGVuZ3RoID4gMCkge1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goYERpZCB5b3UgbWVhbjogJHtzaW1pbGFyRnVuY3Rpb25zLmpvaW4oJywgJyl9P2ApO1xuICB9XG4gIFxuICAvLyBDaGVjayBmb3IgY29tbW9uIG5hbWluZyBwYXR0ZXJuc1xuICBjb25zdCBuYW1pbmdQYXR0ZXJucyA9IFtcbiAgICB7IHBhdHRlcm46IC9eZ2V0Lywgc3VnZ2VzdGlvbjogXCJGb3IgZGF0YSBmZXRjaGluZywgY29uc2lkZXI6IGZldGNoLCBsb2FkLCBvciByZXRyaWV2ZVwiIH0sXG4gICAgeyBwYXR0ZXJuOiAvXmNyZWF0ZS8sIHN1Z2dlc3Rpb246IFwiRm9yIGNyZWF0aW9uLCBjb25zaWRlcjogYWRkLCBpbnNlcnQsIG9yIHNhdmVcIiB9LFxuICAgIHsgcGF0dGVybjogL151cGRhdGUvLCBzdWdnZXN0aW9uOiBcIkZvciB1cGRhdGVzLCBjb25zaWRlcjogZWRpdCwgbW9kaWZ5LCBvciBjaGFuZ2VcIiB9LFxuICAgIHsgcGF0dGVybjogL15kZWxldGUvLCBzdWdnZXN0aW9uOiBcIkZvciBkZWxldGlvbiwgY29uc2lkZXI6IHJlbW92ZSwgZGVzdHJveSwgb3IgY2xlYXJcIiB9XG4gIF07XG4gIFxuICBjb25zdCBtYXRjaGluZ1BhdHRlcm4gPSBuYW1pbmdQYXR0ZXJucy5maW5kKHAgPT4gcC5wYXR0ZXJuLnRlc3QoZnVuY3Rpb25OYW1lKSk7XG4gIGlmIChtYXRjaGluZ1BhdHRlcm4pIHtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKG1hdGNoaW5nUGF0dGVybi5zdWdnZXN0aW9uKTtcbiAgfVxuICBcbiAgaWYgKGF2YWlsYWJsZUZ1bmN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiTm8gZnVuY3Rpb25zIGFyZSBleHBvcnRlZCBmcm9tIHRoaXMgbW9kdWxlLiBNYWtlIHN1cmUgdG8gZXhwb3J0IHlvdXIgZnVuY3Rpb25zLlwiKTtcbiAgfVxuICBcbiAgcmV0dXJuIHtcbiAgICBtZXNzYWdlOiBjcmVhdGVFbmhhbmNlZEVycm9yKFxuICAgICAgXCJGdW5jdGlvbiBOb3QgRm91bmRcIixcbiAgICAgIGBGdW5jdGlvbiAnJHtmdW5jdGlvbk5hbWV9JyBub3QgZm91bmQgaW4gbW9kdWxlICcke21vZHVsZU5hbWV9J2AsXG4gICAgICB7XG4gICAgICAgIGZ1bmN0aW9uTmFtZSxcbiAgICAgICAgYXZhaWxhYmxlRnVuY3Rpb25zLFxuICAgICAgICBzdWdnZXN0aW9uOiBzdWdnZXN0aW9ucy5qb2luKCcgJylcbiAgICAgIH1cbiAgICApLFxuICAgIGNvZGU6IFwiRlVOQ1RJT05fTk9UX0ZPVU5EXCIsXG4gICAgc3VnZ2VzdGlvbnNcbiAgfTtcbn1cblxuLyoqXG4gKiBFbmhhbmNlIEFTVCBwYXJzaW5nIGVycm9yc1xuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSB0aGF0IGZhaWxlZCB0byBwYXJzZVxuICogQHBhcmFtIHtFcnJvcn0gb3JpZ2luYWxFcnJvciAtIE9yaWdpbmFsIHBhcnNpbmcgZXJyb3JcbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmhhbmNlUGFyc2luZ0Vycm9yKGZpbGVQYXRoLCBvcmlnaW5hbEVycm9yKSB7XG4gIGNvbnN0IHN1Z2dlc3Rpb25zID0gW107XG4gIFxuICBpZiAob3JpZ2luYWxFcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdVbmV4cGVjdGVkIHRva2VuJykpIHtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiQ2hlY2sgZm9yIHN5bnRheCBlcnJvcnMgaW4geW91ciBzZXJ2ZXIgYWN0aW9uIGZpbGVcIik7XG4gICAgc3VnZ2VzdGlvbnMucHVzaChcIkVuc3VyZSBhbGwgZnVuY3Rpb25zIGFyZSBwcm9wZXJseSBleHBvcnRlZFwiKTtcbiAgfVxuICBcbiAgaWYgKG9yaWdpbmFsRXJyb3IubWVzc2FnZS5pbmNsdWRlcygnSWRlbnRpZmllcicpKSB7XG4gICAgc3VnZ2VzdGlvbnMucHVzaChcIkZ1bmN0aW9uIG5hbWVzIG11c3QgYmUgdmFsaWQgSmF2YVNjcmlwdCBpZGVudGlmaWVyc1wiKTtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiRnVuY3Rpb24gbmFtZXMgY2Fubm90IHN0YXJ0IHdpdGggbnVtYmVycyBvciBjb250YWluIHNwZWNpYWwgY2hhcmFjdGVyc1wiKTtcbiAgfVxuICBcbiAgaWYgKG9yaWdpbmFsRXJyb3IubWVzc2FnZS5pbmNsdWRlcygnZHVwbGljYXRlJykpIHtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiRWFjaCBmdW5jdGlvbiBuYW1lIG11c3QgYmUgdW5pcXVlIHdpdGhpbiB0aGUgc2FtZSBmaWxlXCIpO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJDb25zaWRlciByZW5hbWluZyBkdXBsaWNhdGUgZnVuY3Rpb25zIG9yIHVzaW5nIGRpZmZlcmVudCBleHBvcnQgcGF0dGVybnNcIik7XG4gIH1cbiAgXG4gIHJldHVybiB7XG4gICAgbWVzc2FnZTogY3JlYXRlRW5oYW5jZWRFcnJvcihcbiAgICAgIFwiUGFyc2luZyBFcnJvclwiLFxuICAgICAgYEZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgYWN0aW9uIGZpbGU6ICR7b3JpZ2luYWxFcnJvci5tZXNzYWdlfWAsXG4gICAgICB7XG4gICAgICAgIGZpbGVQYXRoLFxuICAgICAgICBzdWdnZXN0aW9uOiBzdWdnZXN0aW9ucy5qb2luKCcgJylcbiAgICAgIH1cbiAgICApLFxuICAgIGNvZGU6IFwiUEFSU0VfRVJST1JcIixcbiAgICBzdWdnZXN0aW9uc1xuICB9O1xufVxuXG4vKipcbiAqIEVuaGFuY2UgdmFsaWRhdGlvbiBlcnJvcnNcbiAqIEBwYXJhbSB7QXJyYXl9IHZhbGlkYXRpb25FcnJvcnMgLSBBcnJheSBvZiB2YWxpZGF0aW9uIGVycm9yc1xuICogQHBhcmFtIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAtIEZ1bmN0aW9uIHRoYXQgZmFpbGVkIHZhbGlkYXRpb25cbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmhhbmNlVmFsaWRhdGlvbkVycm9yKHZhbGlkYXRpb25FcnJvcnMsIGZ1bmN0aW9uTmFtZSkge1xuICBjb25zdCBzdWdnZXN0aW9ucyA9IFtdO1xuICBcbiAgLy8gQW5hbHl6ZSBjb21tb24gdmFsaWRhdGlvbiBwYXR0ZXJuc1xuICBjb25zdCBoYXNUeXBlRXJyb3JzID0gdmFsaWRhdGlvbkVycm9ycy5zb21lKGVyciA9PiBcbiAgICBlcnIubWVzc2FnZS5pbmNsdWRlcygnRXhwZWN0ZWQnKSB8fCBlcnIubWVzc2FnZS5pbmNsdWRlcygnSW52YWxpZCcpXG4gICk7XG4gIFxuICBpZiAoaGFzVHlwZUVycm9ycykge1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJDaGVjayB0aGUgdHlwZXMgb2YgYXJndW1lbnRzIHlvdSdyZSBwYXNzaW5nIHRvIHRoZSBmdW5jdGlvblwiKTtcbiAgfVxuICBcbiAgY29uc3QgaGFzUmVxdWlyZWRFcnJvcnMgPSB2YWxpZGF0aW9uRXJyb3JzLnNvbWUoZXJyID0+IFxuICAgIGVyci5tZXNzYWdlLmluY2x1ZGVzKCdyZXF1aXJlZCcpIHx8IGVyci5tZXNzYWdlLmluY2x1ZGVzKCdtaXNzaW5nJylcbiAgKTtcbiAgXG4gIGlmIChoYXNSZXF1aXJlZEVycm9ycykge1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJNYWtlIHN1cmUgYWxsIHJlcXVpcmVkIHBhcmFtZXRlcnMgYXJlIHByb3ZpZGVkXCIpO1xuICB9XG4gIFxuICBjb25zdCBoYXNGb3JtYXRFcnJvcnMgPSB2YWxpZGF0aW9uRXJyb3JzLnNvbWUoZXJyID0+IFxuICAgIGVyci5tZXNzYWdlLmluY2x1ZGVzKCdmb3JtYXQnKSB8fCBlcnIubWVzc2FnZS5pbmNsdWRlcygncGF0dGVybicpXG4gICk7XG4gIFxuICBpZiAoaGFzRm9ybWF0RXJyb3JzKSB7XG4gICAgc3VnZ2VzdGlvbnMucHVzaChcIkNoZWNrIHRoZSBmb3JtYXQgb2Ygc3RyaW5nIGlucHV0cyAoZW1haWwsIFVSTCwgZXRjLilcIik7XG4gIH1cbiAgXG4gIHJldHVybiB7XG4gICAgbWVzc2FnZTogY3JlYXRlRW5oYW5jZWRFcnJvcihcbiAgICAgIFwiVmFsaWRhdGlvbiBFcnJvclwiLFxuICAgICAgYFZhbGlkYXRpb24gZmFpbGVkIGZvciBmdW5jdGlvbiAnJHtmdW5jdGlvbk5hbWV9J2AsXG4gICAgICB7XG4gICAgICAgIGZ1bmN0aW9uTmFtZSxcbiAgICAgICAgc3VnZ2VzdGlvbjogc3VnZ2VzdGlvbnMuam9pbignICcpXG4gICAgICB9XG4gICAgKSxcbiAgICBjb2RlOiBcIlZBTElEQVRJT05fRVJST1JcIixcbiAgICBzdWdnZXN0aW9uc1xuICB9O1xufVxuXG4vKipcbiAqIEVuaGFuY2UgbW9kdWxlIGxvYWRpbmcgZXJyb3JzXG4gKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlUGF0aCAtIFBhdGggdG8gbW9kdWxlIHRoYXQgZmFpbGVkIHRvIGxvYWRcbiAqIEBwYXJhbSB7RXJyb3J9IG9yaWdpbmFsRXJyb3IgLSBPcmlnaW5hbCBsb2FkaW5nIGVycm9yXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5oYW5jZU1vZHVsZUxvYWRFcnJvcihtb2R1bGVQYXRoLCBvcmlnaW5hbEVycm9yKSB7XG4gIGNvbnN0IHN1Z2dlc3Rpb25zID0gW107XG4gIFxuICBpZiAob3JpZ2luYWxFcnJvci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJNYWtlIHN1cmUgdGhlIGZpbGUgZXhpc3RzIGFuZCB0aGUgcGF0aCBpcyBjb3JyZWN0XCIpO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJDaGVjayB0aGF0IHlvdXIgYnVpbGQgcHJvY2VzcyBoYXNuJ3QgbW92ZWQgb3IgcmVuYW1lZCB0aGUgZmlsZVwiKTtcbiAgfVxuICBcbiAgaWYgKG9yaWdpbmFsRXJyb3IubWVzc2FnZS5pbmNsdWRlcygnaW1wb3J0JykpIHtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiVmVyaWZ5IGFsbCBpbXBvcnQgc3RhdGVtZW50cyBpbiB5b3VyIHNlcnZlciBhY3Rpb24gZmlsZVwiKTtcbiAgICBzdWdnZXN0aW9ucy5wdXNoKFwiTWFrZSBzdXJlIGltcG9ydGVkIG1vZHVsZXMgYXJlIGluc3RhbGxlZCBhbmQgYXZhaWxhYmxlXCIpO1xuICB9XG4gIFxuICBpZiAob3JpZ2luYWxFcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdleHBvcnQnKSkge1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJFbnN1cmUgeW91ciBmdW5jdGlvbnMgYXJlIHByb3Blcmx5IGV4cG9ydGVkXCIpO1xuICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJVc2UgJ2V4cG9ydCBmdW5jdGlvbicgb3IgJ2V4cG9ydCBjb25zdCcgZm9yIHlvdXIgc2VydmVyIGFjdGlvbnNcIik7XG4gIH1cbiAgXG4gIHJldHVybiB7XG4gICAgbWVzc2FnZTogY3JlYXRlRW5oYW5jZWRFcnJvcihcbiAgICAgIFwiTW9kdWxlIExvYWQgRXJyb3JcIixcbiAgICAgIGBGYWlsZWQgdG8gbG9hZCBzZXJ2ZXIgYWN0aW9uIG1vZHVsZTogJHtvcmlnaW5hbEVycm9yLm1lc3NhZ2V9YCxcbiAgICAgIHtcbiAgICAgICAgZmlsZVBhdGg6IG1vZHVsZVBhdGgsXG4gICAgICAgIHN1Z2dlc3Rpb246IHN1Z2dlc3Rpb25zLmpvaW4oJyAnKVxuICAgICAgfVxuICAgICksXG4gICAgY29kZTogXCJNT0RVTEVfTE9BRF9FUlJPUlwiLFxuICAgIHN1Z2dlc3Rpb25zXG4gIH07XG59XG5cbi8qKlxuICogRW5oYW5jZSBkZXZlbG9wbWVudCB3YXJuaW5ncyB3aXRoIGhlbHBmdWwgY29udGV4dFxuICogQHBhcmFtIHtzdHJpbmd9IHdhcm5pbmdUeXBlIC0gVHlwZSBvZiB3YXJuaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIFdhcm5pbmcgbWVzc2FnZVxuICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgLSBBZGRpdGlvbmFsIGNvbnRleHRcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcod2FybmluZ1R5cGUsIG1lc3NhZ2UsIGNvbnRleHQgPSB7fSkge1xuICBsZXQgd2FybmluZyA9IGBbVml0ZSBTZXJ2ZXIgQWN0aW9uc10gXHUyNkEwXHVGRTBGICR7d2FybmluZ1R5cGV9OiAke21lc3NhZ2V9YDtcbiAgXG4gIGlmIChjb250ZXh0LmZpbGVQYXRoKSB7XG4gICAgd2FybmluZyArPSBgXFxuICBcdUQ4M0RcdURDQzEgRmlsZTogJHtjb250ZXh0LmZpbGVQYXRofWA7XG4gIH1cbiAgXG4gIGlmIChjb250ZXh0LnN1Z2dlc3Rpb24pIHtcbiAgICB3YXJuaW5nICs9IGBcXG4gIFx1RDgzRFx1RENBMSBUaXA6ICR7Y29udGV4dC5zdWdnZXN0aW9ufWA7XG4gIH1cbiAgXG4gIHJldHVybiB3YXJuaW5nO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBMZXZlbnNodGVpbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzXG4gKiBAcGFyYW0ge3N0cmluZ30gYSAtIEZpcnN0IHN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IGIgLSBTZWNvbmQgc3RyaW5nXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiBsZXZlbnNodGVpbkRpc3RhbmNlKGEsIGIpIHtcbiAgY29uc3QgbWF0cml4ID0gW107XG4gIFxuICBmb3IgKGxldCBpID0gMDsgaSA8PSBiLmxlbmd0aDsgaSsrKSB7XG4gICAgbWF0cml4W2ldID0gW2ldO1xuICB9XG4gIFxuICBmb3IgKGxldCBqID0gMDsgaiA8PSBhLmxlbmd0aDsgaisrKSB7XG4gICAgbWF0cml4WzBdW2pdID0gajtcbiAgfVxuICBcbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gYi5sZW5ndGg7IGkrKykge1xuICAgIGZvciAobGV0IGogPSAxOyBqIDw9IGEubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChiLmNoYXJBdChpIC0gMSkgPT09IGEuY2hhckF0KGogLSAxKSkge1xuICAgICAgICBtYXRyaXhbaV1bal0gPSBtYXRyaXhbaSAtIDFdW2ogLSAxXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hdHJpeFtpXVtqXSA9IE1hdGgubWluKFxuICAgICAgICAgIG1hdHJpeFtpIC0gMV1baiAtIDFdICsgMSxcbiAgICAgICAgICBtYXRyaXhbaV1baiAtIDFdICsgMSxcbiAgICAgICAgICBtYXRyaXhbaSAtIDFdW2pdICsgMVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuIG1hdHJpeFtiLmxlbmd0aF1bYS5sZW5ndGhdO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGhlbHBmdWwgc3VnZ2VzdGlvbnMgYmFzZWQgb24gY29tbW9uIG1pc3Rha2VzXG4gKiBAcGFyYW0ge3N0cmluZ30gZXJyb3JDb250ZXh0IC0gQ29udGV4dCB3aGVyZSBlcnJvciBvY2N1cnJlZFxuICogQHBhcmFtIHtPYmplY3R9IGFkZGl0aW9uYWxJbmZvIC0gQWRkaXRpb25hbCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZXJyb3JcbiAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVIZWxwZnVsU3VnZ2VzdGlvbnMoZXJyb3JDb250ZXh0LCBhZGRpdGlvbmFsSW5mbyA9IHt9KSB7XG4gIGNvbnN0IHN1Z2dlc3Rpb25zID0gW107XG4gIFxuICBzd2l0Y2ggKGVycm9yQ29udGV4dCkge1xuICAgIGNhc2UgJ25vLWZ1bmN0aW9ucy1mb3VuZCc6XG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKFwiTWFrZSBzdXJlIHlvdXIgZnVuY3Rpb25zIGFyZSBleHBvcnRlZDogZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG15RnVuY3Rpb24oKSB7fVwiKTtcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJDaGVjayB0aGF0IHlvdXIgZmlsZSBlbmRzIHdpdGggLnNlcnZlci5qcyBvciAuc2VydmVyLnRzXCIpO1xuICAgICAgc3VnZ2VzdGlvbnMucHVzaChcIlZlcmlmeSB0aGUgZmlsZSBpcyBpbiBhIGxvY2F0aW9uIG1hdGNoZWQgYnkgeW91ciBpbmNsdWRlIHBhdHRlcm5zXCIpO1xuICAgICAgYnJlYWs7XG4gICAgICBcbiAgICBjYXNlICdhc3luYy1mdW5jdGlvbi1yZXF1aXJlZCc6XG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKFwiU2VydmVyIGFjdGlvbnMgc2hvdWxkIGJlIGFzeW5jIGZ1bmN0aW9uc1wiKTtcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJDaGFuZ2UgJ2V4cG9ydCBmdW5jdGlvbicgdG8gJ2V4cG9ydCBhc3luYyBmdW5jdGlvbidcIik7XG4gICAgICBicmVhaztcbiAgICAgIFxuICAgIGNhc2UgJ2ludmFsaWQtYXJndW1lbnRzJzpcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJBbGwgZnVuY3Rpb24gYXJndW1lbnRzIG11c3QgYmUgSlNPTi1zZXJpYWxpemFibGVcIik7XG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKFwiRnVuY3Rpb25zLCBjbGFzc2VzLCBhbmQgb3RoZXIgY29tcGxleCBvYmplY3RzIGNhbm5vdCBiZSBwYXNzZWRcIik7XG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKFwiQ29uc2lkZXIgcGFzc2luZyBwbGFpbiBvYmplY3RzLCBhcnJheXMsIHN0cmluZ3MsIGFuZCBudW1iZXJzIG9ubHlcIik7XG4gICAgICBicmVhaztcbiAgICAgIFxuICAgIGNhc2UgJ3R5cGUtc2FmZXR5JzpcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJBZGQgVHlwZVNjcmlwdCB0eXBlcyB0byB5b3VyIHNlcnZlciBhY3Rpb25zIGZvciBiZXR0ZXIgZGV2ZWxvcG1lbnQgZXhwZXJpZW5jZVwiKTtcbiAgICAgIHN1Z2dlc3Rpb25zLnB1c2goXCJVc2UgWm9kIHNjaGVtYXMgZm9yIHJ1bnRpbWUgdmFsaWRhdGlvblwiKTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIFxuICByZXR1cm4gc3VnZ2VzdGlvbnM7XG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyY1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2hlbGdlL2NvZGUvdml0ZS1zZXJ2ZXItYWN0aW9ucy9zcmMvZGV2LXZhbGlkYXRvci5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvaGVsZ2UvY29kZS92aXRlLXNlcnZlci1hY3Rpb25zL3NyYy9kZXYtdmFsaWRhdG9yLmpzXCI7LyoqXG4gKiBEZXZlbG9wbWVudC10aW1lIHZhbGlkYXRpb24gYW5kIGZlZWRiYWNrIHN5c3RlbVxuICogUHJvdmlkZXMgcmVhbC10aW1lIGZlZWRiYWNrIHRvIGRldmVsb3BlcnMgYWJvdXQgdGhlaXIgc2VydmVyIGFjdGlvbnNcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcsIGdlbmVyYXRlSGVscGZ1bFN1Z2dlc3Rpb25zIH0gZnJvbSAnLi9lcnJvci1lbmhhbmNlci5qcyc7XG5cbi8qKlxuICogVmFsaWRhdGUgZnVuY3Rpb24gcGFyYW1ldGVycyBhbmQgcHJvdmlkZSBmZWVkYmFja1xuICogQHBhcmFtIHtPYmplY3R9IGZ1bmMgLSBGdW5jdGlvbiBpbmZvcm1hdGlvbiBmcm9tIEFTVFxuICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gRmlsZSBwYXRoIGZvciBjb250ZXh0XG4gKiBAcmV0dXJucyB7QXJyYXk8c3RyaW5nPn0gLSBBcnJheSBvZiB2YWxpZGF0aW9uIHdhcm5pbmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUZ1bmN0aW9uU2lnbmF0dXJlKGZ1bmMsIGZpbGVQYXRoKSB7XG4gIGNvbnN0IHdhcm5pbmdzID0gW107XG4gIFxuICAvLyBDaGVjayBmb3IgcHJvcGVyIHBhcmFtZXRlciB0eXBpbmdcbiAgaWYgKGZ1bmMucGFyYW1zICYmIGZ1bmMucGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB1bnR5cGVkUGFyYW1zID0gZnVuYy5wYXJhbXMuZmlsdGVyKHBhcmFtID0+ICFwYXJhbS50eXBlKTtcbiAgICBcbiAgICBpZiAodW50eXBlZFBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKGNyZWF0ZURldmVsb3BtZW50V2FybmluZyhcbiAgICAgICAgXCJNaXNzaW5nIFR5cGUgQW5ub3RhdGlvbnNcIixcbiAgICAgICAgYFBhcmFtZXRlcnMgJHt1bnR5cGVkUGFyYW1zLm1hcChwID0+IHAubmFtZSkuam9pbignLCAnKX0gaW4gJyR7ZnVuYy5uYW1lfScgbGFjayB0eXBlIGFubm90YXRpb25zYCxcbiAgICAgICAge1xuICAgICAgICAgIGZpbGVQYXRoLFxuICAgICAgICAgIHN1Z2dlc3Rpb246IFwiQWRkIFR5cGVTY3JpcHQgdHlwZXMgZm9yIGJldHRlciBkZXZlbG9wbWVudCBleHBlcmllbmNlIGFuZCB0eXBlIHNhZmV0eVwiXG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gQ2hlY2sgZm9yIHByb3BlciByZXR1cm4gdHlwZSBhbm5vdGF0aW9uXG4gIGlmICghZnVuYy5yZXR1cm5UeXBlICYmIGZ1bmMuaXNBc3luYykge1xuICAgIHdhcm5pbmdzLnB1c2goY3JlYXRlRGV2ZWxvcG1lbnRXYXJuaW5nKFxuICAgICAgXCJNaXNzaW5nIFJldHVybiBUeXBlXCIsXG4gICAgICBgQXN5bmMgZnVuY3Rpb24gJyR7ZnVuYy5uYW1lfScgc2hvdWxkIGhhdmUgYSByZXR1cm4gdHlwZSBhbm5vdGF0aW9uYCxcbiAgICAgIHtcbiAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgIHN1Z2dlc3Rpb246IFwiQWRkIHJldHVybiB0eXBlIGxpa2U6IFByb21pc2U8TXlSZXR1cm5UeXBlPlwiXG4gICAgICB9XG4gICAgKSk7XG4gIH1cbiAgXG4gIC8vIENoZWNrIGZvciBKU0RvYyBkb2N1bWVudGF0aW9uXG4gIGlmICghZnVuYy5qc2RvYykge1xuICAgIHdhcm5pbmdzLnB1c2goY3JlYXRlRGV2ZWxvcG1lbnRXYXJuaW5nKFxuICAgICAgXCJNaXNzaW5nIERvY3VtZW50YXRpb25cIixcbiAgICAgIGBGdW5jdGlvbiAnJHtmdW5jLm5hbWV9JyBsYWNrcyBKU0RvYyBkb2N1bWVudGF0aW9uYCxcbiAgICAgIHtcbiAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgIHN1Z2dlc3Rpb246IFwiQWRkIEpTRG9jIGNvbW1lbnRzIHRvIGRvY3VtZW50IHdoYXQgdGhpcyBmdW5jdGlvbiBkb2VzXCJcbiAgICAgIH1cbiAgICApKTtcbiAgfVxuICBcbiAgLy8gQ2hlY2sgZm9yIGNvbXBsZXggcGFyYW1ldGVyIHBhdHRlcm5zIHRoYXQgbWlnaHQgYmUgaGFyZCB0byBzZXJpYWxpemVcbiAgaWYgKGZ1bmMucGFyYW1zKSB7XG4gICAgY29uc3QgY29tcGxleFBhcmFtcyA9IGZ1bmMucGFyYW1zLmZpbHRlcihwYXJhbSA9PiBcbiAgICAgIHBhcmFtLm5hbWUuaW5jbHVkZXMoJ3snKSB8fCBwYXJhbS5uYW1lLmluY2x1ZGVzKCdbJylcbiAgICApO1xuICAgIFxuICAgIGlmIChjb21wbGV4UGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goY3JlYXRlRGV2ZWxvcG1lbnRXYXJuaW5nKFxuICAgICAgICBcIkNvbXBsZXggUGFyYW1ldGVyIERlc3RydWN0dXJpbmdcIixcbiAgICAgICAgYEZ1bmN0aW9uICcke2Z1bmMubmFtZX0nIHVzZXMgY29tcGxleCBkZXN0cnVjdHVyaW5nIHRoYXQgbWlnaHQgYmUgaGFyZCB0byBzZXJpYWxpemVgLFxuICAgICAgICB7XG4gICAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgICAgc3VnZ2VzdGlvbjogXCJDb25zaWRlciB1c2luZyBzaW1wbGUgcGFyYW1ldGVycyBhbmQgZGVzdHJ1Y3R1cmUgaW5zaWRlIHRoZSBmdW5jdGlvblwiXG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuIHdhcm5pbmdzO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHNlcnZlciBhY3Rpb24gZmlsZSBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSB7QXJyYXl9IGZ1bmN0aW9uRGV0YWlscyAtIEFycmF5IG9mIGZ1bmN0aW9uIGRldGFpbHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIEZpbGUgcGF0aCBmb3IgY29udGV4dFxuICogQHJldHVybnMge0FycmF5PHN0cmluZz59IC0gQXJyYXkgb2YgdmFsaWRhdGlvbiB3YXJuaW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVGaWxlU3RydWN0dXJlKGZ1bmN0aW9uRGV0YWlscywgZmlsZVBhdGgpIHtcbiAgY29uc3Qgd2FybmluZ3MgPSBbXTtcbiAgXG4gIC8vIENoZWNrIGlmIGZpbGUgaGFzIGFueSBmdW5jdGlvbnNcbiAgaWYgKGZ1bmN0aW9uRGV0YWlscy5sZW5ndGggPT09IDApIHtcbiAgICB3YXJuaW5ncy5wdXNoKGNyZWF0ZURldmVsb3BtZW50V2FybmluZyhcbiAgICAgIFwiTm8gRnVuY3Rpb25zIEZvdW5kXCIsXG4gICAgICBcIk5vIGV4cG9ydGVkIGZ1bmN0aW9ucyBmb3VuZCBpbiBzZXJ2ZXIgYWN0aW9uIGZpbGVcIixcbiAgICAgIHtcbiAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgIHN1Z2dlc3Rpb246IFwiTWFrZSBzdXJlIHRvIGV4cG9ydCB5b3VyIGZ1bmN0aW9uczogZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG15RnVuY3Rpb24oKSB7fVwiXG4gICAgICB9XG4gICAgKSk7XG4gICAgcmV0dXJuIHdhcm5pbmdzO1xuICB9XG4gIFxuICAvLyBDaGVjayBmb3IgdG9vIG1hbnkgZnVuY3Rpb25zIGluIG9uZSBmaWxlXG4gIGlmIChmdW5jdGlvbkRldGFpbHMubGVuZ3RoID4gMTApIHtcbiAgICB3YXJuaW5ncy5wdXNoKGNyZWF0ZURldmVsb3BtZW50V2FybmluZyhcbiAgICAgIFwiTGFyZ2UgRmlsZVwiLFxuICAgICAgYEZpbGUgY29udGFpbnMgJHtmdW5jdGlvbkRldGFpbHMubGVuZ3RofSBmdW5jdGlvbnMuIENvbnNpZGVyIHNwbGl0dGluZyBpbnRvIHNtYWxsZXIgbW9kdWxlc2AsXG4gICAgICB7XG4gICAgICAgIGZpbGVQYXRoLFxuICAgICAgICBzdWdnZXN0aW9uOiBcIkdyb3VwIHJlbGF0ZWQgZnVuY3Rpb25zIGFuZCBzcGxpdCBpbnRvIG11bHRpcGxlIC5zZXJ2ZXIuanMgZmlsZXNcIlxuICAgICAgfVxuICAgICkpO1xuICB9XG4gIFxuICAvLyBDaGVjayBmb3IgbmFtaW5nIGNvbnNpc3RlbmN5XG4gIGNvbnN0IGZ1bmN0aW9uTmFtZXMgPSBmdW5jdGlvbkRldGFpbHMubWFwKGZuID0+IGZuLm5hbWUpO1xuICBjb25zdCBoYXNJbmNvbnNpc3RlbnROYW1pbmcgPSBjaGVja05hbWluZ0NvbnNpc3RlbmN5KGZ1bmN0aW9uTmFtZXMpO1xuICBcbiAgaWYgKGhhc0luY29uc2lzdGVudE5hbWluZykge1xuICAgIHdhcm5pbmdzLnB1c2goY3JlYXRlRGV2ZWxvcG1lbnRXYXJuaW5nKFxuICAgICAgXCJJbmNvbnNpc3RlbnQgTmFtaW5nXCIsXG4gICAgICBcIkZ1bmN0aW9uIG5hbWVzIHVzZSBpbmNvbnNpc3RlbnQgbmFtaW5nIHBhdHRlcm5zXCIsXG4gICAgICB7XG4gICAgICAgIGZpbGVQYXRoLFxuICAgICAgICBzdWdnZXN0aW9uOiBcIlVzZSBjb25zaXN0ZW50IG5hbWluZzogY2FtZWxDYXNlIChnZXRVc2VyQnlJZCkgb3Igc25ha2VfY2FzZSAoZ2V0X3VzZXJfYnlfaWQpXCJcbiAgICAgIH1cbiAgICApKTtcbiAgfVxuICBcbiAgcmV0dXJuIHdhcm5pbmdzO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIGZ1bmN0aW9uIGFyZ3VtZW50cyBhdCBydW50aW1lIChkZXZlbG9wbWVudCBvbmx5KVxuICogQHBhcmFtIHtzdHJpbmd9IGZ1bmN0aW9uTmFtZSAtIE5hbWUgb2YgdGhlIGZ1bmN0aW9uIGJlaW5nIGNhbGxlZFxuICogQHBhcmFtIHtBcnJheX0gYXJncyAtIEFyZ3VtZW50cyBiZWluZyBwYXNzZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBmdW5jdGlvbkluZm8gLSBGdW5jdGlvbiBtZXRhZGF0YVxuICogQHJldHVybnMge0FycmF5PHN0cmluZz59IC0gQXJyYXkgb2YgdmFsaWRhdGlvbiB3YXJuaW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVSdW50aW1lQXJndW1lbnRzKGZ1bmN0aW9uTmFtZSwgYXJncywgZnVuY3Rpb25JbmZvKSB7XG4gIGNvbnN0IHdhcm5pbmdzID0gW107XG4gIFxuICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdkZXZlbG9wbWVudCcpIHtcbiAgICByZXR1cm4gd2FybmluZ3M7IC8vIE9ubHkgdmFsaWRhdGUgaW4gZGV2ZWxvcG1lbnRcbiAgfVxuICBcbiAgLy8gQ2hlY2sgYXJndW1lbnQgY291bnRcbiAgaWYgKGZ1bmN0aW9uSW5mbyAmJiBmdW5jdGlvbkluZm8ucGFyYW1zKSB7XG4gICAgY29uc3QgcmVxdWlyZWRQYXJhbXMgPSBmdW5jdGlvbkluZm8ucGFyYW1zLmZpbHRlcihwID0+ICFwLmlzT3B0aW9uYWwgJiYgIXAuaXNSZXN0KTtcbiAgICBjb25zdCBtYXhQYXJhbXMgPSBmdW5jdGlvbkluZm8ucGFyYW1zLmZpbHRlcihwID0+ICFwLmlzUmVzdCkubGVuZ3RoO1xuICAgIFxuICAgIGlmIChhcmdzLmxlbmd0aCA8IHJlcXVpcmVkUGFyYW1zLmxlbmd0aCkge1xuICAgICAgd2FybmluZ3MucHVzaChgRnVuY3Rpb24gJyR7ZnVuY3Rpb25OYW1lfScgZXhwZWN0cyBhdCBsZWFzdCAke3JlcXVpcmVkUGFyYW1zLmxlbmd0aH0gYXJndW1lbnRzLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGFyZ3MubGVuZ3RoID4gbWF4UGFyYW1zICYmICFmdW5jdGlvbkluZm8ucGFyYW1zLnNvbWUocCA9PiBwLmlzUmVzdCkpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goYEZ1bmN0aW9uICcke2Z1bmN0aW9uTmFtZX0nIGV4cGVjdHMgYXQgbW9zdCAke21heFBhcmFtc30gYXJndW1lbnRzLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIENoZWNrIGZvciBub24tc2VyaWFsaXphYmxlIGFyZ3VtZW50c1xuICBhcmdzLmZvckVhY2goKGFyZywgaW5kZXgpID0+IHtcbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgd2FybmluZ3MucHVzaChgQXJndW1lbnQgJHtpbmRleCArIDF9IGlzIGEgZnVuY3Rpb24gYW5kIGNhbm5vdCBiZSBzZXJpYWxpemVkYCk7XG4gICAgfSBlbHNlIGlmIChhcmcgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKGBBcmd1bWVudCAke2luZGV4ICsgMX0gaXMgYSBEYXRlIG9iamVjdC4gQ29uc2lkZXIgcGFzc2luZyBhcyBJU08gc3RyaW5nYCk7XG4gICAgfSBlbHNlIGlmIChhcmcgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goYEFyZ3VtZW50ICR7aW5kZXggKyAxfSBpcyBhIFJlZ0V4cCBhbmQgY2Fubm90IGJlIHNlcmlhbGl6ZWRgKTtcbiAgICB9IGVsc2UgaWYgKGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcuY29uc3RydWN0b3IgIT09IE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKGBBcmd1bWVudCAke2luZGV4ICsgMX0gaXMgYSBjdXN0b20gb2JqZWN0IGluc3RhbmNlIHRoYXQgbWF5IG5vdCBzZXJpYWxpemUgcHJvcGVybHlgKTtcbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIHdhcm5pbmdzO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGRldmVsb3BtZW50LXRpbWUgdHlwZSBpbmZvcm1hdGlvblxuICogQHBhcmFtIHtPYmplY3R9IGZ1bmN0aW9uSW5mbyAtIEZ1bmN0aW9uIGluZm9ybWF0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIFR5cGVTY3JpcHQtbGlrZSB0eXBlIGRlZmluaXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVHlwZUluZm8oZnVuY3Rpb25JbmZvKSB7XG4gIGNvbnN0IHsgbmFtZSwgcGFyYW1zLCByZXR1cm5UeXBlLCBpc0FzeW5jIH0gPSBmdW5jdGlvbkluZm87XG4gIFxuICBjb25zdCBwYXJhbVN0cmluZ3MgPSBwYXJhbXMubWFwKHBhcmFtID0+IHtcbiAgICBsZXQgcGFyYW1TdHIgPSBwYXJhbS5uYW1lO1xuICAgIGlmIChwYXJhbS50eXBlKSB7XG4gICAgICBwYXJhbVN0ciArPSBgOiAke3BhcmFtLnR5cGV9YDtcbiAgICB9XG4gICAgaWYgKHBhcmFtLmRlZmF1bHRWYWx1ZSkge1xuICAgICAgcGFyYW1TdHIgKz0gYCA9ICR7cGFyYW0uZGVmYXVsdFZhbHVlfWA7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbVN0cjtcbiAgfSk7XG4gIFxuICBjb25zdCByZXR1cm5UeXBlU3RyID0gcmV0dXJuVHlwZSB8fCAnYW55JztcbiAgY29uc3QgZmluYWxSZXR1cm5UeXBlID0gaXNBc3luYyA/IGBQcm9taXNlPCR7cmV0dXJuVHlwZVN0cn0+YCA6IHJldHVyblR5cGVTdHI7XG4gIFxuICByZXR1cm4gYGZ1bmN0aW9uICR7bmFtZX0oJHtwYXJhbVN0cmluZ3Muam9pbignLCAnKX0pOiAke2ZpbmFsUmV0dXJuVHlwZX1gO1xufVxuXG4vKipcbiAqIENoZWNrIG5hbWluZyBjb25zaXN0ZW5jeSBhY3Jvc3MgZnVuY3Rpb25zXG4gKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IGZ1bmN0aW9uTmFtZXMgLSBBcnJheSBvZiBmdW5jdGlvbiBuYW1lc1xuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiBuYW1pbmcgaXMgaW5jb25zaXN0ZW50XG4gKi9cbmZ1bmN0aW9uIGNoZWNrTmFtaW5nQ29uc2lzdGVuY3koZnVuY3Rpb25OYW1lcykge1xuICBpZiAoZnVuY3Rpb25OYW1lcy5sZW5ndGggPCAyKSByZXR1cm4gZmFsc2U7XG4gIFxuICBjb25zdCBjYW1lbENhc2VDb3VudCA9IGZ1bmN0aW9uTmFtZXMuZmlsdGVyKG5hbWUgPT4gL15bYS16XVthLXpBLVowLTldKiQvLnRlc3QobmFtZSkpLmxlbmd0aDtcbiAgY29uc3Qgc25ha2VDYXNlQ291bnQgPSBmdW5jdGlvbk5hbWVzLmZpbHRlcihuYW1lID0+IC9eW2Etel1bYS16MC05X10qJC8udGVzdChuYW1lKSAmJiBuYW1lLmluY2x1ZGVzKCdfJykpLmxlbmd0aDtcbiAgY29uc3QgcGFzY2FsQ2FzZUNvdW50ID0gZnVuY3Rpb25OYW1lcy5maWx0ZXIobmFtZSA9PiAvXltBLVpdW2EtekEtWjAtOV0qJC8udGVzdChuYW1lKSkubGVuZ3RoO1xuICBcbiAgLy8gSWYgbXVsdGlwbGUgbmFtaW5nIHN0eWxlcyBhcmUgdXNlZCBzaWduaWZpY2FudGx5LCBpdCdzIGluY29uc2lzdGVudFxuICBjb25zdCBzdHlsZXMgPSBbY2FtZWxDYXNlQ291bnQsIHNuYWtlQ2FzZUNvdW50LCBwYXNjYWxDYXNlQ291bnRdLmZpbHRlcihjb3VudCA9PiBjb3VudCA+IDApO1xuICByZXR1cm4gc3R5bGVzLmxlbmd0aCA+IDEgJiYgTWF0aC5tYXgoLi4uc3R5bGVzKSA8IGZ1bmN0aW9uTmFtZXMubGVuZ3RoICogMC44O1xufVxuXG4vKipcbiAqIENyZWF0ZSBkZXZlbG9wbWVudCBmZWVkYmFjayBmb3IgdGhlIGNvbnNvbGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBzZXJ2ZXJGdW5jdGlvbnMgLSBNYXAgb2Ygc2VydmVyIGZ1bmN0aW9uc1xuICogQHJldHVybnMge3N0cmluZ30gLSBGb3JtYXR0ZWQgZmVlZGJhY2sgbWVzc2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGV2ZWxvcG1lbnRGZWVkYmFjayhzZXJ2ZXJGdW5jdGlvbnMpIHtcbiAgbGV0IGZlZWRiYWNrID0gJ1xcbltWaXRlIFNlcnZlciBBY3Rpb25zXSBcdUQ4M0RcdURDQ0IgRGV2ZWxvcG1lbnQgRmVlZGJhY2s6XFxuJztcbiAgXG4gIGNvbnN0IHRvdGFsRnVuY3Rpb25zID0gQXJyYXkuZnJvbShzZXJ2ZXJGdW5jdGlvbnMudmFsdWVzKCkpXG4gICAgLnJlZHVjZSgoc3VtLCBtb2R1bGUpID0+IHN1bSArIChtb2R1bGUuZnVuY3Rpb25zPy5sZW5ndGggfHwgMCksIDApO1xuICBcbiAgZmVlZGJhY2sgKz0gYCAgXHVEODNEXHVEQ0NBIEZvdW5kICR7dG90YWxGdW5jdGlvbnN9IHNlcnZlciBhY3Rpb25zIGFjcm9zcyAke3NlcnZlckZ1bmN0aW9ucy5zaXplfSBtb2R1bGVzXFxuYDtcbiAgXG4gIC8vIExpc3QgbW9kdWxlcyBhbmQgdGhlaXIgZnVuY3Rpb25zXG4gIGZvciAoY29uc3QgW21vZHVsZU5hbWUsIG1vZHVsZUluZm9dIG9mIHNlcnZlckZ1bmN0aW9ucykge1xuICAgIGNvbnN0IHsgZnVuY3Rpb25zLCBmaWxlUGF0aCB9ID0gbW9kdWxlSW5mbztcbiAgICBmZWVkYmFjayArPSBgICBcdUQ4M0RcdURDQzEgJHtmaWxlUGF0aH06ICR7ZnVuY3Rpb25zLmpvaW4oJywgJyl9XFxuYDtcbiAgfVxuICBcbiAgZmVlZGJhY2sgKz0gJ1xcbiAgXHVEODNEXHVEQ0ExIFRpcHM6XFxuJztcbiAgZmVlZGJhY2sgKz0gJyAgICBcdTIwMjIgQWRkIFR5cGVTY3JpcHQgdHlwZXMgZm9yIGJldHRlciBJbnRlbGxpU2Vuc2VcXG4nO1xuICBmZWVkYmFjayArPSAnICAgIFx1MjAyMiBVc2UgWm9kIHNjaGVtYXMgZm9yIHJ1bnRpbWUgdmFsaWRhdGlvblxcbic7XG4gIGZlZWRiYWNrICs9ICcgICAgXHUyMDIyIEtlZXAgZnVuY3Rpb25zIGZvY3VzZWQgYW5kIHdlbGwtZG9jdW1lbnRlZFxcbic7XG4gIFxuICByZXR1cm4gZmVlZGJhY2s7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgWm9kIHNjaGVtYSBhdHRhY2htZW50XG4gKiBAcGFyYW0ge09iamVjdH0gbW9kdWxlRXhwb3J0cyAtIEV4cG9ydGVkIG1vZHVsZVxuICogQHBhcmFtIHtBcnJheX0gZnVuY3Rpb25OYW1lcyAtIEFycmF5IG9mIGZ1bmN0aW9uIG5hbWVzXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBGaWxlIHBhdGggZm9yIGNvbnRleHRcbiAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fSAtIEFycmF5IG9mIHZhbGlkYXRpb24gc3VnZ2VzdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2NoZW1hQXR0YWNobWVudChtb2R1bGVFeHBvcnRzLCBmdW5jdGlvbk5hbWVzLCBmaWxlUGF0aCkge1xuICBjb25zdCBzdWdnZXN0aW9ucyA9IFtdO1xuICBcbiAgZnVuY3Rpb25OYW1lcy5mb3JFYWNoKGZ1bmNOYW1lID0+IHtcbiAgICBjb25zdCBmdW5jID0gbW9kdWxlRXhwb3J0c1tmdW5jTmFtZV07XG4gICAgaWYgKGZ1bmMgJiYgdHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmICghZnVuYy5zY2hlbWEpIHtcbiAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChjcmVhdGVEZXZlbG9wbWVudFdhcm5pbmcoXG4gICAgICAgICAgXCJNaXNzaW5nIFZhbGlkYXRpb24gU2NoZW1hXCIsXG4gICAgICAgICAgYEZ1bmN0aW9uICcke2Z1bmNOYW1lfScgaGFzIG5vIGF0dGFjaGVkIFpvZCBzY2hlbWFgLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZpbGVQYXRoLFxuICAgICAgICAgICAgc3VnZ2VzdGlvbjogYEFkZDogJHtmdW5jTmFtZX0uc2NoZW1hID0gei5vYmplY3QoeyAvKiB5b3VyIHNjaGVtYSAqLyB9KTtgXG4gICAgICAgICAgfVxuICAgICAgICApKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBcbiAgcmV0dXJuIHN1Z2dlc3Rpb25zO1xufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVcsU0FBUyxvQkFBb0I7QUFDaFksT0FBTyxTQUFTOzs7QUNEaVIsT0FBT0EsU0FBUTtBQUNoVCxPQUFPQyxXQUFVO0FBQ2pCLE9BQU8sYUFBYTtBQUNwQixTQUFTLGNBQWM7QUFDdkIsU0FBUyxpQkFBaUI7OztBQ0ppUixTQUFTLFNBQVM7OztBQ0F0QixPQUFPLFVBQVU7QUFRalQsU0FBUyxhQUFhLFVBQVUsVUFBVTtBQUMvQyxNQUFJLENBQUMsWUFBWSxPQUFPLGFBQWEsVUFBVTtBQUM3QyxXQUFPO0FBQUEsRUFDVDtBQUdB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
