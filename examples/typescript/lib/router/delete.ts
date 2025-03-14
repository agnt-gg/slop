import { SCOPE_KEY, type ScopePattern, STATUS_CODES } from "../../slop.ts";
import { createScopeError } from "../Scope.ts";
import type { SlopManager } from "../SlopManager.ts";
import { extractPathParams } from "../utils.ts";
import { createError, createResponse } from "./Router.ts";

/**
 * Handle DELETE requests
 * @see {handleHttpRequest}
 *
 * @param request - The HTTP request to handle
 * @returns A Promise resolving to the HTTP response
 */
// deno-lint-ignore require-await
export async function handleDelete(request: Request, slopManager: SlopManager): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const scopeHeader = request.headers.get(SCOPE_KEY) || "";

  try {
    // MEMORY ENDPOINTS

    // DELETE /memory/:key - Delete a key-value pair
    const { key: memoryKey = "" } = extractPathParams(path, "/memory/:key");
    if (memoryKey) {
      // Check if the user has permission to write to the memory key
      const requiredScope = `memory.${memoryKey}.write` as ScopePattern;
      if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
        return Promise.resolve(
          createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN),
        );
      }

      const result = slopManager.memory.delete(memoryKey);
      if (!result) {
        return Promise.resolve(createResponse(
          createError("NOT_FOUND", "Memory key not found", STATUS_CODES.NOT_FOUND),
          STATUS_CODES.NOT_FOUND,
        ));
      }

      return Promise.resolve(createResponse(result, STATUS_CODES.OK));
    }

    return Promise.resolve(createResponse(
      createError("NOT_FOUND", "Endpoint not found", STATUS_CODES.NOT_FOUND),
      STATUS_CODES.NOT_FOUND,
    ));
  } catch (error) {
    const processedError = error instanceof Error ? error : String(error);
    return Promise.resolve(createResponse(processedError));
  }
}
