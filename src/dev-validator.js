/**
 * Development-time validation and feedback system
 * Provides real-time feedback to developers about their server actions
 */

import { createDevelopmentWarning, generateHelpfulSuggestions } from './error-enhancer.js';

/**
 * Validate function parameters and provide feedback
 * @param {Object} func - Function information from AST
 * @param {string} filePath - File path for context
 * @returns {Array<string>} - Array of validation warnings
 */
export function validateFunctionSignature(func, filePath) {
  const warnings = [];
  
  // Check for proper parameter typing
  if (func.params && func.params.length > 0) {
    const untypedParams = func.params.filter(param => !param.type);
    
    if (untypedParams.length > 0) {
      warnings.push(createDevelopmentWarning(
        "Missing Type Annotations",
        `Parameters ${untypedParams.map(p => p.name).join(', ')} in '${func.name}' lack type annotations`,
        {
          filePath,
          suggestion: "Add TypeScript types for better development experience and type safety"
        }
      ));
    }
  }
  
  // Check for proper return type annotation
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
  
  // Check for JSDoc documentation
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
  
  // Check for complex parameter patterns that might be hard to serialize
  if (func.params) {
    const complexParams = func.params.filter(param => 
      param.name.includes('{') || param.name.includes('[')
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

/**
 * Validate server action file structure
 * @param {Array} functionDetails - Array of function details
 * @param {string} filePath - File path for context
 * @returns {Array<string>} - Array of validation warnings
 */
export function validateFileStructure(functionDetails, filePath) {
  const warnings = [];
  
  // Check if file has any functions
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
  
  // Check for too many functions in one file
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
  
  // Check for naming consistency
  const functionNames = functionDetails.map(fn => fn.name);
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

/**
 * Validate function arguments at runtime (development only)
 * @param {string} functionName - Name of the function being called
 * @param {Array} args - Arguments being passed
 * @param {Object} functionInfo - Function metadata
 * @returns {Array<string>} - Array of validation warnings
 */
export function validateRuntimeArguments(functionName, args, functionInfo) {
  const warnings = [];
  
  if (process.env.NODE_ENV !== 'development') {
    return warnings; // Only validate in development
  }
  
  // Check argument count
  if (functionInfo && functionInfo.params) {
    const requiredParams = functionInfo.params.filter(p => !p.isOptional && !p.isRest);
    const maxParams = functionInfo.params.filter(p => !p.isRest).length;
    
    if (args.length < requiredParams.length) {
      warnings.push(`Function '${functionName}' expects at least ${requiredParams.length} arguments, got ${args.length}`);
    }
    
    if (args.length > maxParams && !functionInfo.params.some(p => p.isRest)) {
      warnings.push(`Function '${functionName}' expects at most ${maxParams} arguments, got ${args.length}`);
    }
  }
  
  // Check for non-serializable arguments
  args.forEach((arg, index) => {
    if (typeof arg === 'function') {
      warnings.push(`Argument ${index + 1} is a function and cannot be serialized`);
    } else if (arg instanceof Date) {
      warnings.push(`Argument ${index + 1} is a Date object. Consider passing as ISO string`);
    } else if (arg instanceof RegExp) {
      warnings.push(`Argument ${index + 1} is a RegExp and cannot be serialized`);
    } else if (arg && typeof arg === 'object' && arg.constructor !== Object && !Array.isArray(arg)) {
      warnings.push(`Argument ${index + 1} is a custom object instance that may not serialize properly`);
    }
  });
  
  return warnings;
}

/**
 * Generate development-time type information
 * @param {Object} functionInfo - Function information
 * @returns {string} - TypeScript-like type definition
 */
export function generateTypeInfo(functionInfo) {
  const { name, params, returnType, isAsync } = functionInfo;
  
  const paramStrings = params.map(param => {
    let paramStr = param.name;
    if (param.type) {
      paramStr += `: ${param.type}`;
    }
    if (param.defaultValue) {
      paramStr += ` = ${param.defaultValue}`;
    }
    return paramStr;
  });
  
  const returnTypeStr = returnType || 'any';
  const finalReturnType = isAsync ? `Promise<${returnTypeStr}>` : returnTypeStr;
  
  return `function ${name}(${paramStrings.join(', ')}): ${finalReturnType}`;
}

/**
 * Check naming consistency across functions
 * @param {Array<string>} functionNames - Array of function names
 * @returns {boolean} - True if naming is inconsistent
 */
function checkNamingConsistency(functionNames) {
  if (functionNames.length < 2) return false;
  
  const camelCaseCount = functionNames.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length;
  const snakeCaseCount = functionNames.filter(name => /^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')).length;
  const pascalCaseCount = functionNames.filter(name => /^[A-Z][a-zA-Z0-9]*$/.test(name)).length;
  
  // If multiple naming styles are used significantly, it's inconsistent
  const styles = [camelCaseCount, snakeCaseCount, pascalCaseCount].filter(count => count > 0);
  return styles.length > 1 && Math.max(...styles) < functionNames.length * 0.8;
}

/**
 * Create development feedback for the console
 * @param {Object} serverFunctions - Map of server functions
 * @returns {string} - Formatted feedback message
 */
export function createDevelopmentFeedback(serverFunctions) {
  let feedback = '\n[Vite Server Actions] 📋 Development Feedback:\n';
  
  const totalFunctions = Array.from(serverFunctions.values())
    .reduce((sum, module) => sum + (module.functions?.length || 0), 0);
  
  feedback += `  📊 Found ${totalFunctions} server actions across ${serverFunctions.size} modules\n`;
  
  // List modules and their functions
  for (const [moduleName, moduleInfo] of serverFunctions) {
    const { functions, filePath } = moduleInfo;
    feedback += `  📁 ${filePath}: ${functions.join(', ')}\n`;
  }
  
  feedback += '\n  💡 Tips:\n';
  feedback += '    • Add TypeScript types for better IntelliSense\n';
  feedback += '    • Use Zod schemas for runtime validation\n';
  feedback += '    • Keep functions focused and well-documented\n';
  
  return feedback;
}

/**
 * Validate Zod schema attachment
 * @param {Object} moduleExports - Exported module
 * @param {Array} functionNames - Array of function names
 * @param {string} filePath - File path for context
 * @returns {Array<string>} - Array of validation suggestions
 */
export function validateSchemaAttachment(moduleExports, functionNames, filePath) {
  const suggestions = [];
  
  functionNames.forEach(funcName => {
    const func = moduleExports[funcName];
    if (func && typeof func === 'function') {
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