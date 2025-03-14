import { SCOPE_KEY, ScopePattern, STATUS_CODES } from "../../slop.ts";
import { createScopeError } from "../Scope.ts";
import { SlopManager } from "../SlopManager.ts";
import { extractPathParams } from "../utils.ts";
import { createError, createResponse } from "./Router.ts";

/**
 * Handle PUT requests
 *
 * @param request - The HTTP request to handle
 * @returns A Promise resolving to the HTTP response
 */
export async function handlePut(request: Request, slopManager: SlopManager): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const scopeHeader = request.headers.get(SCOPE_KEY) || "";

  try {
    // Parse the request body as JSON
    const body = await request.json();

    // MEMORY ENDPOINTS

    // PUT /memory/:key - Update existing value
    const memoryParams = extractPathParams(path, "/memory/:key");
    if (memoryParams && memoryParams["key"]) {
      // Check if the user has permission to write to the memory key
      const requiredScope = `memory.${memoryParams["key"]}.write` as ScopePattern;
      if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
        return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
      }

      if (!body || body["value"] === undefined) {
        return createResponse(
          createError(
            "INVALID_REQUEST",
            "A value is required",
            STATUS_CODES.BAD_REQUEST,
          ),
          STATUS_CODES.BAD_REQUEST,
        );
      }

      const result = slopManager.memory.update(memoryParams["key"], body["value"]);
      if (!result) {
        return createResponse(
          createError("NOT_FOUND", "Memory key not found", STATUS_CODES.NOT_FOUND),
          STATUS_CODES.NOT_FOUND,
        );
      }

      return createResponse(result, STATUS_CODES.OK);
    }

    return createResponse(
      createError("NOT_FOUND", "Endpoint not found", STATUS_CODES.NOT_FOUND),
      STATUS_CODES.NOT_FOUND,
    );
  } catch (error) {
    const processedError = error instanceof Error ? error : String(error);
    return createResponse(processedError);
  }
}
