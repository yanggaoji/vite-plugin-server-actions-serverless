import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Extract exported functions from JavaScript/TypeScript code using AST parsing
 * @param {string} code - The source code to parse
 * @param {string} filename - The filename (for better error messages)
 * @returns {Array<{name: string, isAsync: boolean, isDefault: boolean, type: string}>}
 */
export function extractExportedFunctions(code, filename = 'unknown') {
  const functions = [];
  
  try {
    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'topLevelAwait',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods'
      ]
    });

    // Traverse the AST to find exported functions
    const traverseFn = traverse.default || traverse;
    traverseFn(ast, {
      // Handle: export function name() {} or export async function name() {}
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration;
        
        if (declaration && declaration.type === 'FunctionDeclaration') {
          if (declaration.id) {
            functions.push({
              name: declaration.id.name,
              isAsync: declaration.async || false,
              isDefault: false,
              type: 'function'
            });
          }
        }
        
        // Handle: export const name = () => {} or export const name = async () => {}
        if (declaration && declaration.type === 'VariableDeclaration') {
          declaration.declarations.forEach(decl => {
            if (decl.init && (
              decl.init.type === 'ArrowFunctionExpression' ||
              decl.init.type === 'FunctionExpression'
            )) {
              functions.push({
                name: decl.id.name,
                isAsync: decl.init.async || false,
                isDefault: false,
                type: 'arrow'
              });
            }
          });
        }
      },
      
      // Handle: export default function() {} or export default async function name() {}
      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        
        if (declaration.type === 'FunctionDeclaration') {
          functions.push({
            name: declaration.id ? declaration.id.name : 'default',
            isAsync: declaration.async || false,
            isDefault: true,
            type: 'function'
          });
        }
        
        // Handle: export default () => {} or export default async () => {}
        if (declaration.type === 'ArrowFunctionExpression' || 
            declaration.type === 'FunctionExpression') {
          functions.push({
            name: 'default',
            isAsync: declaration.async || false,
            isDefault: true,
            type: 'arrow'
          });
        }
      },
      
      // Handle: export { functionName } or export { internalName as publicName }
      ExportSpecifier(path) {
        // We need to track these and match them with function declarations
        const localName = path.node.local.name;
        const exportedName = path.node.exported.name;
        
        // Look for the function in the module scope
        const binding = path.scope.getBinding(localName);
        if (binding && binding.path.isFunctionDeclaration()) {
          functions.push({
            name: exportedName,
            isAsync: binding.path.node.async || false,
            isDefault: false,
            type: 'renamed'
          });
        }
        
        // Check if it's a variable with arrow function
        if (binding && binding.path.isVariableDeclarator()) {
          const init = binding.path.node.init;
          if (init && (init.type === 'ArrowFunctionExpression' || 
                       init.type === 'FunctionExpression')) {
            functions.push({
              name: exportedName,
              isAsync: init.async || false,
              isDefault: false,
              type: 'renamed-arrow'
            });
          }
        }
      }
    });

  } catch (error) {
    console.error(`Failed to parse ${filename}: ${error.message}`);
    // Return empty array on parse error rather than throwing
    return [];
  }

  // Remove duplicates and return
  const uniqueFunctions = Array.from(new Map(
    functions.map(fn => [fn.name, fn])
  ).values());
  
  return uniqueFunctions;
}

/**
 * Validate if a function name is valid JavaScript identifier
 * @param {string} name - The function name to validate
 * @returns {boolean}
 */
export function isValidFunctionName(name) {
  // Check if it's a valid JavaScript identifier
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Extract function parameter names from AST (for future use with validation)
 * @param {object} functionNode - The function AST node
 * @returns {Array<string>}
 */
export function extractFunctionParams(functionNode) {
  const params = [];
  
  if (functionNode.params) {
    functionNode.params.forEach(param => {
      if (param.type === 'Identifier') {
        params.push(param.name);
      } else if (param.type === 'RestElement' && param.argument.type === 'Identifier') {
        params.push(`...${param.argument.name}`);
      }
      // Handle destructuring and other patterns if needed
    });
  }
  
  return params;
}