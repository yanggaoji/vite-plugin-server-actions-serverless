import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Extract exported functions from JavaScript/TypeScript code using AST parsing
 * @param {string} code - The source code to parse
 * @param {string} filename - The filename (for better error messages)
 * @returns {Array<{name: string, isAsync: boolean, isDefault: boolean, type: string, params: Array, returnType: string|null, jsdoc: string|null}>}
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
              type: 'function',
              params: extractDetailedParams(declaration.params),
              returnType: extractTypeAnnotation(declaration.returnType),
              jsdoc: extractJSDoc(path.node.leadingComments)
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
                type: 'arrow',
                params: extractDetailedParams(decl.init.params),
                returnType: extractTypeAnnotation(decl.init.returnType),
                jsdoc: extractJSDoc(declaration.leadingComments)
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
            type: 'function',
            params: extractDetailedParams(declaration.params),
            returnType: extractTypeAnnotation(declaration.returnType),
            jsdoc: extractJSDoc(path.node.leadingComments)
          });
        }
        
        // Handle: export default () => {} or export default async () => {}
        if (declaration.type === 'ArrowFunctionExpression' || 
            declaration.type === 'FunctionExpression') {
          functions.push({
            name: 'default',
            isAsync: declaration.async || false,
            isDefault: true,
            type: 'arrow',
            params: extractDetailedParams(declaration.params),
            returnType: extractTypeAnnotation(declaration.returnType),
            jsdoc: extractJSDoc(path.node.leadingComments)
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
            type: 'renamed',
            params: extractDetailedParams(binding.path.node.params),
            returnType: extractTypeAnnotation(binding.path.node.returnType),
            jsdoc: extractJSDoc(binding.path.node.leadingComments)
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
              type: 'renamed-arrow',
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
 * Extract detailed parameter information from function parameters
 * @param {Array} params - Array of parameter AST nodes
 * @returns {Array<{name: string, type: string|null, defaultValue: string|null, isOptional: boolean, isRest: boolean}>}
 */
export function extractDetailedParams(params) {
  if (!params) return [];
  
  return params.map(param => {
    const paramInfo = {
      name: '',
      type: null,
      defaultValue: null,
      isOptional: false,
      isRest: false
    };

    if (param.type === 'Identifier') {
      paramInfo.name = param.name;
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    } else if (param.type === 'AssignmentPattern') {
      // Handle default parameters: function(name = 'default')
      paramInfo.name = param.left.name;
      paramInfo.type = extractTypeAnnotation(param.left.typeAnnotation);
      paramInfo.defaultValue = generateCode(param.right);
      paramInfo.isOptional = true;
    } else if (param.type === 'RestElement') {
      // Handle rest parameters: function(...args)
      paramInfo.name = `...${param.argument.name}`;
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isRest = true;
    } else if (param.type === 'ObjectPattern') {
      // Handle destructuring: function({name, age})
      paramInfo.name = generateCode(param);
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    } else if (param.type === 'ArrayPattern') {
      // Handle array destructuring: function([first, second])
      paramInfo.name = generateCode(param);
      paramInfo.type = extractTypeAnnotation(param.typeAnnotation);
      paramInfo.isOptional = param.optional || false;
    }

    return paramInfo;
  });
}

/**
 * Extract type annotation as string
 * @param {object} typeAnnotation - Type annotation AST node
 * @returns {string|null}
 */
export function extractTypeAnnotation(typeAnnotation) {
  if (!typeAnnotation || !typeAnnotation.typeAnnotation) return null;
  
  return generateCode(typeAnnotation.typeAnnotation);
}

/**
 * Extract JSDoc comments
 * @param {Array} comments - Array of comment nodes
 * @returns {string|null}
 */
export function extractJSDoc(comments) {
  if (!comments) return null;
  
  const jsdocComment = comments.find(comment => 
    comment.type === 'CommentBlock' && comment.value.startsWith('*')
  );
  
  return jsdocComment ? `/*${jsdocComment.value}*/` : null;
}

/**
 * Generate code string from AST node (simplified)
 * @param {object} node - AST node
 * @returns {string}
 */
function generateCode(node) {
  if (!node) return '';
  
  try {
    // Simple code generation for common cases
    switch (node.type) {
      case 'Identifier':
        return node.name;
      case 'StringLiteral':
        return `"${node.value}"`;
      case 'NumericLiteral':
        return String(node.value);
      case 'BooleanLiteral':
        return String(node.value);
      case 'NullLiteral':
        return 'null';
      case 'TSStringKeyword':
        return 'string';
      case 'TSNumberKeyword':
        return 'number';
      case 'TSBooleanKeyword':
        return 'boolean';
      case 'TSAnyKeyword':
        return 'any';
      case 'TSUnknownKeyword':
        return 'unknown';
      case 'TSVoidKeyword':
        return 'void';
      case 'TSArrayType':
        return `${generateCode(node.elementType)}[]`;
      case 'TSUnionType':
        return node.types.map(type => generateCode(type)).join(' | ');
      case 'TSLiteralType':
        return generateCode(node.literal);
      case 'ObjectPattern':
        const props = node.properties.map(prop => {
          if (prop.type === 'ObjectProperty') {
            return prop.key.name;
          } else if (prop.type === 'RestElement') {
            return `...${prop.argument.name}`;
          }
          return '';
        }).filter(Boolean);
        return `{${props.join(', ')}}`;
      case 'ArrayPattern':
        const elements = node.elements.map((elem, i) => 
          elem ? (elem.type === 'Identifier' ? elem.name : `_${i}`) : `_${i}`
        );
        return `[${elements.join(', ')}]`;
      case 'TSTypeReference':
        // Handle type references like Todo, CreateTodoInput, etc.
        if (node.typeName && node.typeName.type === 'Identifier') {
          const typeName = node.typeName.name;
          // Handle generic types like Promise<T>, Array<T>
          if (node.typeParameters && node.typeParameters.params && node.typeParameters.params.length > 0) {
            const typeArgs = node.typeParameters.params.map(param => generateCode(param)).join(', ');
            return `${typeName}<${typeArgs}>`;
          }
          return typeName;
        }
        return 'unknown';
      case 'TSTypeLiteral':
        // Handle object type literals
        if (node.members && node.members.length > 0) {
          const members = node.members.map(member => {
            if (member.type === 'TSPropertySignature' && member.key) {
              const key = member.key.type === 'Identifier' ? member.key.name : 'unknown';
              const type = member.typeAnnotation ? generateCode(member.typeAnnotation.typeAnnotation) : 'any';
              const optional = member.optional ? '?' : '';
              return `${key}${optional}: ${type}`;
            }
            return '';
          }).filter(Boolean);
          return `{ ${members.join('; ')} }`;
        }
        return '{}';
      case 'TSInterfaceDeclaration':
        // Handle interface declarations
        return node.id ? node.id.name : 'unknown';
      case 'TSNullKeyword':
        return 'null';
      case 'TSUndefinedKeyword':
        return 'undefined';
      case 'TSFunctionType':
        // Handle function type signatures
        const funcParams = node.parameters.map(param => {
          const paramName = param.name ? param.name : '_';
          const paramType = param.typeAnnotation ? generateCode(param.typeAnnotation.typeAnnotation) : 'any';
          return `${paramName}: ${paramType}`;
        }).join(', ');
        const funcReturn = node.typeAnnotation ? generateCode(node.typeAnnotation.typeAnnotation) : 'void';
        return `(${funcParams}) => ${funcReturn}`;
      default:
        // Fallback for complex types
        return node.type || 'unknown';
    }
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Extract function parameter names from AST (legacy compatibility)
 * @param {object} functionNode - The function AST node
 * @returns {Array<string>}
 */
export function extractFunctionParams(functionNode) {
  return extractDetailedParams(functionNode.params).map(param => param.name);
}