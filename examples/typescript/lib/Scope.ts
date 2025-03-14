/**
 * @module SLOP-TS-SCOPE
 * @description Enhanced ScopeManager implementation for the SLOP pattern
 * @author {SLOP-TS} P. Hughes <https://github.com/phughesmcr>
 * @author {SLOP} agnt-gg <https://github.com/agnt-gg>
 * @see https://github.com/agnt-gg/slop
 * @version 0.0.1
 * @license MIT
 */

import { ScopeErrorResponse, ScopePattern } from "../slop.ts";

/**
 * Creates a scope-related error object
 *
 * @param requiredScope The scope pattern that would be required for access
 * @returns A properly formatted ScopeErrorResponse object
 */
export function createScopeError(requiredScope: ScopePattern): ScopeErrorResponse {
  // Parse the scope to provide a more informative error message
  const segments = requiredScope.split(".");
  const resourceType = segments[0];

  let errorMessage = `Scope violation: ${requiredScope} requires explicit permission`;

  // For frequently used scopes, provide additional helpful information
  if (resourceType === "chat" && segments.length > 1) {
    if (segments[1] === "*" || segments[1] === "") {
      errorMessage = "Access to all chats requires explicit 'chat.*' scope permission";
    } else if (segments.length > 2 && segments[2] === "write") {
      errorMessage = `Write access to chat ${segments[1]} requires 'chat.${
        segments[1]
      }.write' scope permission`;
    } else if (segments.length > 2 && segments[2] === "read") {
      errorMessage = `Read access to chat ${segments[1]} requires 'chat.${
        segments[1]
      }.read' scope permission`;
    }
  } else if (resourceType === "tools" && segments.length > 1) {
    if (segments[1] === "*" || segments[1] === "") {
      errorMessage = "Access to all tools requires explicit 'tools.*' scope permission";
    } else if (segments.length > 2 && segments[2] === "execute") {
      errorMessage = `Execute access to tool ${segments[1]} requires 'tools.${
        segments[1]
      }.execute' scope permission`;
    }
  }

  return {
    error: errorMessage,
    permitted: false,
  };
}

/**
 * Type guard to validate a scope pattern
 * @param scope The scope pattern to validate
 * @returns true if the scope pattern is valid, false otherwise
 */
export function isValidScopePattern(scope: string): scope is ScopePattern {
  // All scope patterns must be strings
  if (typeof scope !== "string") return false;

  // Basic format validation
  const segments = scope.split(".");

  // Require at least a resource type
  if (segments.length === 0) return false;

  // Validate the resource type (first segment)
  const validResourceTypes = ["chat", "tools", "memory", "resources", "pay"];
  // Make sure segments[0] exists and is a valid resource type
  if (!segments[0] || !validResourceTypes.includes(segments[0])) return false;

  // Basic validation of other segments
  // Resource ID should be present for specific permissions
  if (segments.length >= 2) {
    // If there's an ID segment, it shouldn't be empty
    if (segments[1] === "") return false;

    // If there's a permission segment, validate it
    if (segments.length >= 3 && segments[2] !== undefined) {
      const validPermissions = ["read", "write", "execute", "list", "safe", "*"];
      if (!validPermissions.includes(segments[2])) return false;
    }
  }

  return true;
}

/**
 * Permission levels for different resource types
 */
export enum Permission {
  // Basic permissions
  READ = "read",
  WRITE = "write",
  EXECUTE = "execute",
  LIST = "list",

  // Special permissions
  SAFE = "safe", // For tools.safe.* categorization
  ALL = "*", // Wildcard permission
}

/**
 * Resource types supported by the SLOP scope system
 */
export enum ResourceType {
  CHAT = "chat",
  TOOLS = "tools",
  MEMORY = "memory",
  RESOURCES = "resources",
  PAY = "pay",
}

/**
 * Mapping of resource types to their allowed permissions
 */
export const RESOURCE_PERMISSIONS = {
  [ResourceType.CHAT]: [Permission.READ, Permission.WRITE],
  [ResourceType.TOOLS]: [Permission.EXECUTE, Permission.LIST, Permission.READ],
  [ResourceType.MEMORY]: [Permission.READ, Permission.WRITE],
  [ResourceType.RESOURCES]: [Permission.READ, Permission.LIST],
  [ResourceType.PAY]: [Permission.EXECUTE, Permission.READ],
};

/**
 * Enhanced scope manager with improved wildcard support and permission handling
 */
export class ScopeManager {
  /**
   * Parses a scope header string into an array of scope patterns
   */
  parseScope(scopeHeader: string): ScopePattern[] {
    if (!scopeHeader) return [];
    return scopeHeader.split(",").map((s) => s.trim()) as ScopePattern[];
  }

  /**
   * Validates if the given scope permits the requested action
   * Enhanced with improved wildcard handling and hierarchical permission checks
   */
  validateScope(requestedScopes: ScopePattern[], requiredScope: ScopePattern): boolean {
    // Direct match check
    if (requestedScopes.includes(requiredScope)) {
      return true;
    }

    // Split the scope into segments
    const requiredSegments = requiredScope.split(".");

    // Check for top-level wildcard (e.g., "chat.*")
    const resourceType = requiredSegments[0] as ResourceType;
    if (requestedScopes.includes(`${resourceType}.*` as ScopePattern)) {
      return true;
    }

    // Handle hierarchical wildcards
    if (requiredSegments.length >= 3) {
      // For scopes like chat.${chat_id}.read, also check if chat.read is granted
      // This allows for both resource-specific permissions and global type permissions
      const permissionSegment = requiredSegments.length >= 3 ? requiredSegments[2] : "";
      if (
        permissionSegment &&
        requestedScopes.includes(
          `${resourceType}.${permissionSegment}` as ScopePattern,
        )
      ) {
        return true;
      }

      // Check for wildcards at different hierarchy levels
      // e.g., tools.calculator.* would grant tools.calculator.execute, tools.calculator.read, etc.
      if (requiredSegments.length >= 3) {
        const wildcardScope = `${resourceType}.${requiredSegments[1]}.*` as ScopePattern;
        if (requestedScopes.includes(wildcardScope)) {
          return true;
        }
      }
    }

    // Special tool handling for tools.safe.* category
    if (resourceType === ResourceType.TOOLS && requiredSegments.length >= 3) {
      const toolId = requiredSegments[1];
      const permission = requiredSegments[2];

      // We don't check if the tool is in the safe category here - that requires
      // context about each tool that this class doesn't have. That happens in SlopManager.

      // Allow tools.safe.toolname permission to access tools.toolname.execute
      if (
        permission === Permission.EXECUTE &&
        requestedScopes.includes(`tools.safe.${toolId}` as ScopePattern)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a scope header permits a required action
   */
  checkPermission(requiredScope: ScopePattern, scopeHeader?: string): boolean {
    // If no scope header is provided, require explicit permission for all operations
    // This follows the principle of least privilege
    if (!scopeHeader) {
      return false; // No permissions granted without an explicit scope
    }

    const scopes = this.parseScope(scopeHeader);
    return this.validateScope(scopes, requiredScope);
  }

  /**
   * Checks if a given scope would include a specific tool
   * Useful for filtering available tools based on scope permissions
   */
  checkToolScope(scopeHeader: string, toolId: string): boolean {
    // A user can use a tool if they have:
    // - tools.* permission (full access to all tools)
    // - tools.toolId.execute (specific permission for this tool)
    // - tools.safe.* (if the tool is categorized as "safe") - handled externally in SlopManager
    // - tools.safe.toolId (specific "safe" permission for this tool)

    return (
      this.checkPermission(
        `tools.${toolId}.execute` as ScopePattern,
        scopeHeader,
      ) ||
      this.checkPermission(
        `tools.safe.${toolId}` as ScopePattern,
        scopeHeader,
      ) ||
      this.checkPermission(
        `tools.*` as ScopePattern,
        scopeHeader,
      )
    );
  }

  /**
   * Generate a properly formatted scope string for a specific resource and permission
   */
  formatScope(
    resourceType: ResourceType,
    resourceId: string,
    permission: Permission,
  ): ScopePattern {
    return `${resourceType}.${resourceId}.${permission}` as ScopePattern;
  }

  /**
   * Check if a permission type is valid for a given resource type
   */
  isValidPermission(
    resourceType: ResourceType,
    permission: Permission,
  ): boolean {
    if (permission === Permission.ALL) return true;
    return RESOURCE_PERMISSIONS[resourceType]?.includes(permission) || false;
  }
}
