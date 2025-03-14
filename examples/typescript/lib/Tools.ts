import {
  Tool,
  ToolExecuteResponse,
  ToolListResponse,
  ToolParameter,
  ToolSchema,
} from "../slop.ts";

/**
 * Parameter validation error details
 */
interface ValidationError {
  path: string;
  message: string;
}

/**
 * Result of parameter validation
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Manages tools and their execution with enhanced parameter validation
 */
export class ToolManager {
  #safeTools: Set<string>;
  #tools: Map<string, Tool>;
  #toolSchemas: Map<string, ToolSchema>;

  constructor() {
    this.#safeTools = new Set();
    this.#tools = new Map();
    this.#toolSchemas = new Map();
  }

  /**
   * Update internal tool schemas based on registered tools
   * This creates properly formatted ToolSchema objects for each tool
   * @private
   */
  #updateToolSchemas(): void {
    this.#toolSchemas.clear();
    for (const tool of this.#tools.values()) {
      // Create default parameters schema based on the tool ID
      let parameters: Record<string, ToolParameter> = {};

      // Generate default parameter schemas based on the tool ID
      if (tool.id === "calculator") {
        parameters = {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate (e.g., '2 + 2', '5 * 10')",
          },
        };
      } else if (tool.id === "weather") {
        parameters = {
          location: {
            type: "string",
            description: "The location to get weather for (e.g., 'New York', 'London')",
          },
        };
      }

      // If the tool has a parameters property already, use that instead
      if (tool.parameters) {
        parameters = { ...parameters, ...tool.parameters };
      }

      this.#toolSchemas.set(tool.id, {
        id: tool.id,
        description: tool.description,
        parameters: parameters,
        example: tool.example,
      });
    }
  }

  /**
   * Validates tool parameters against the schema
   * @param params The parameters to validate
   * @param schema The parameter schema to validate against
   * @returns Validation result with details of any errors
   */
  #validateParameters(
    params: Record<string, unknown>,
    schema: Record<string, ToolParameter>,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for required parameters
    for (const [paramName, paramSchema] of Object.entries(schema)) {
      if (paramSchema.required && !(paramName in params)) {
        errors.push({
          path: paramName,
          message: `Required parameter '${paramName}' is missing`,
        });
        continue;
      }

      // If parameter is not provided but not required, continue
      if (!(paramName in params)) {
        continue;
      }

      const value = params[paramName];

      // Validate parameter type
      if (!this.#validateType(value, paramSchema)) {
        errors.push({
          path: paramName,
          message: `Parameter '${paramName}' must be of type ${paramSchema.type}`,
        });
      }

      // Validate string-specific constraints
      if (paramSchema.type === "string" && typeof value === "string") {
        // Minimum length
        if (paramSchema.minLength !== undefined && value.length < paramSchema.minLength) {
          errors.push({
            path: paramName,
            message:
              `Parameter '${paramName}' must be at least ${paramSchema.minLength} characters long`,
          });
        }

        // Maximum length
        if (paramSchema.maxLength !== undefined && value.length > paramSchema.maxLength) {
          errors.push({
            path: paramName,
            message:
              `Parameter '${paramName}' must be at most ${paramSchema.maxLength} characters long`,
          });
        }

        // Pattern matching
        if (paramSchema.pattern !== undefined) {
          const regex = new RegExp(paramSchema.pattern);
          if (!regex.test(value)) {
            errors.push({
              path: paramName,
              message: `Parameter '${paramName}' must match pattern: ${paramSchema.pattern}`,
            });
          }
        }
      }

      // Validate number-specific constraints
      if (
        (paramSchema.type === "number" || paramSchema.type === "integer") &&
        typeof value === "number"
      ) {
        // Minimum value
        if (paramSchema.minimum !== undefined && value < paramSchema.minimum) {
          errors.push({
            path: paramName,
            message: `Parameter '${paramName}' must be at least ${paramSchema.minimum}`,
          });
        }

        // Maximum value
        if (paramSchema.maximum !== undefined && value > paramSchema.maximum) {
          errors.push({
            path: paramName,
            message: `Parameter '${paramName}' must be at most ${paramSchema.maximum}`,
          });
        }

        // Integer validation
        if (paramSchema.type === "integer" && !Number.isInteger(value)) {
          errors.push({
            path: paramName,
            message: `Parameter '${paramName}' must be an integer`,
          });
        }
      }

      // Validate array-specific constraints
      if (paramSchema.type === "array" && Array.isArray(value)) {
        // Minimum items
        if (paramSchema.minItems !== undefined && value.length < paramSchema.minItems) {
          errors.push({
            path: paramName,
            message:
              `Parameter '${paramName}' must contain at least ${paramSchema.minItems} items`,
          });
        }

        // Maximum items
        if (paramSchema.maxItems !== undefined && value.length > paramSchema.maxItems) {
          errors.push({
            path: paramName,
            message: `Parameter '${paramName}' must contain at most ${paramSchema.maxItems} items`,
          });
        }

        // Item validation if items schema is defined
        if (paramSchema.items && typeof paramSchema.items === "object") {
          for (let i = 0; i < value.length; i++) {
            const itemValue = value[i];
            if (!this.#validateType(itemValue, paramSchema.items)) {
              errors.push({
                path: `${paramName}[${i}]`,
                message: `Item at index ${i} must be of type ${paramSchema.items.type}`,
              });
            }
          }
        }
      }

      // Validate enum values
      if (paramSchema.enum !== undefined) {
        if (!paramSchema.enum.includes(value as string | number | boolean)) {
          errors.push({
            path: paramName,
            message: `Parameter '${paramName}' must be one of: ${paramSchema.enum.join(", ")}`,
          });
        }
      }
    }

    // Check for unknown parameters (if additionalProperties is false)
    const paramNames = Object.keys(schema);
    for (const param in params) {
      if (!paramNames.includes(param)) {
        errors.push({
          path: param,
          message: `Unknown parameter '${param}'`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a value against a type
   * @param value The value to validate
   * @param schema The parameter schema to validate against
   * @returns True if the value is valid against the schema type
   */
  #validateType(value: unknown, schema: ToolParameter): boolean {
    // Handle null values
    if (value === null) {
      return schema.type === "null" || schema.nullable === true;
    }

    // Handle undefined values (treat as missing)
    if (value === undefined) {
      return !schema.required;
    }

    switch (schema.type) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "integer":
        return typeof value === "number" && !isNaN(value) && Number.isInteger(value);
      case "boolean":
        return typeof value === "boolean";
      case "array":
        return Array.isArray(value);
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Validate a tool definition
   * @param tool The tool to validate
   * @returns Validation result with details of any errors
   */
  #validateToolDefinition(tool: Tool): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!tool.id) {
      errors.push({
        path: "id",
        message: "Tool ID is required",
      });
    }

    if (!tool.description) {
      errors.push({
        path: "description",
        message: "Tool description is required",
      });
    }

    if (!tool.execute || typeof tool.execute !== "function") {
      errors.push({
        path: "execute",
        message: "Tool execute function is required",
      });
    }

    // Validate parameter definitions if present
    if (tool.parameters) {
      for (const [paramName, paramSchema] of Object.entries(tool.parameters)) {
        // Parameter must have a type
        if (!paramSchema.type) {
          errors.push({
            path: `parameters.${paramName}.type`,
            message: `Parameter '${paramName}' must have a type`,
          });
        }

        // Parameter should have a description
        if (!paramSchema.description) {
          errors.push({
            path: `parameters.${paramName}.description`,
            message: `Parameter '${paramName}' should have a description`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Register a new tool with the tool manager
   * @param tool The tool to register
   * @param isSafe Whether the tool is safe to use without specific permissions
   * @throws Error if the tool definition is invalid
   */
  registerTool(tool: Tool, isSafe = false): void {
    // Validate the tool definition
    const validationResult = this.#validateToolDefinition(tool);
    if (!validationResult.valid) {
      throw new Error(
        `Invalid tool definition: ${
          validationResult.errors.map((e) => `${e.path}: ${e.message}`).join(", ")
        }`,
      );
    }

    this.#tools.set(tool.id, tool);
    if (isSafe) {
      this.#safeTools.add(tool.id);
    }
    this.#updateToolSchemas();
  }

  /**
   * Get a tool by ID
   * @param id The ID of the tool to get
   * @returns The tool or null if not found
   */
  getTool(id: string): Tool | null {
    return this.#tools.get(id) || null;
  }

  /**
   * Check if a tool is marked as safe
   * @param id The ID of the tool to check
   * @returns True if the tool is safe
   */
  isToolSafe(id: string): boolean {
    return this.#safeTools.has(id);
  }

  /**
   * List all available tools
   * @returns Response object containing all tools
   */
  listTools(): ToolListResponse {
    return { tools: Array.from(this.#toolSchemas.values()) };
  }

  /**
   * Execute a tool with the given parameters
   * @param id The ID of the tool to execute
   * @param params The parameters to pass to the tool
   * @returns The result of the tool execution
   * @throws Error if the tool is not found or parameters are invalid
   */
  async executeTool(id: string, params: Record<string, unknown>): Promise<ToolExecuteResponse> {
    const tool = this.#tools.get(id);
    if (!tool) {
      throw new Error(`Tool ${id} not found`);
    }

    // Get the tool schema
    const schema = this.#toolSchemas.get(id);
    if (!schema) {
      throw new Error(`Schema for tool ${id} not found`);
    }

    // Check if schema.parameters is a string and handle it appropriately
    const validationResult = typeof schema.parameters === "string"
      ? { valid: true, errors: [] } // Skip validation for string schema (backward compatibility)
      : this.#validateParameters(params, schema.parameters);

    if (!validationResult.valid) {
      throw new Error(
        `Invalid parameters: ${
          validationResult.errors.map((e) => `${e.path}: ${e.message}`).join(", ")
        }`,
      );
    }

    try {
      const result = await tool.execute(params);
      return { result };
    } catch (error) {
      throw new Error(
        `Error executing tool ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
