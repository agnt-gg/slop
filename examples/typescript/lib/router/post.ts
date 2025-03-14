import {
  ChatPostRequest,
  MemoryValue,
  SCOPE_KEY,
  ScopePattern,
  STATUS_CODES,
} from "../../slop.ts";
import { createScopeError, Permission, ResourceType } from "../Scope.ts";
import { SlopManager } from "../SlopManager.ts";
import { extractPathParams, generateChatId } from "../utils.ts";
import {
  createBinaryResponse,
  createError,
  createResponse,
  createStreamResponse,
} from "./Router.ts";

/**
 * TODO: move this
 * Process tool execution results and create custom responses if needed
 *
 * This method allows for special handling of certain tool results,
 * such as returning binary data, specific content types, or other
 * non-standard responses.
 *
 * @param toolId - The ID of the tool that was executed
 * @param result - The raw result returned by the tool's execute method
 * @returns A custom Response object if special handling is needed, or null to use the default response
 */
function handleToolResponse(toolId: string, result: unknown): Response | null {
  // Special handling for specific tools
  switch (toolId) {
    // Example: Handle image generator tools
    case "image-generator":
      // If the result is a base64 encoded image, return it with the correct content type
      if (typeof result === "string" && result.startsWith("data:image/")) {
        const [header, base64Data] = result.split(",");
        const contentType = header?.split(";")[0]?.replace("data:", "") || "application/json";
        const binaryData = Uint8Array.from(atob(base64Data || ""), (c) => c.charCodeAt(0));

        return createBinaryResponse(binaryData, contentType);
      }
      break;

    // Example: Handle file downloader tools
    case "file-downloader":
      if (
        result &&
        typeof result === "object" &&
        "fileName" in result &&
        "data" in result &&
        typeof result.fileName === "string" &&
        typeof result.data === "string"
      ) {
        const binaryData = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));

        return createBinaryResponse(binaryData, "application/octet-stream", {
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
        });
      }
      break;
  }

  // For standard JSON responses, return null to use the default response handler
  return null;
}

/**
 * Handle POST requests
 *
 * @param request - The HTTP request to handle
 * @returns A Promise resolving to the HTTP response
 */
export async function handlePost(request: Request, slopManager: SlopManager): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const scopeHeader = request.headers.get(SCOPE_KEY) || "";

  // Parse the request body as JSON (if any)
  let body: Record<string, unknown> = {};
  try {
    if (request.body) body = await request.json();
    if (!body) {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "Request body is missing or malformed",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    // Only validate messages array for chat endpoints
    if (path === "/chat" || path === "/chat/stream") {
      if (!Array.isArray(body["messages"]) || body["messages"].length === 0) {
        return createResponse(
          createError(
            "INVALID_REQUEST",
            "Request body must contain a messages array",
            STATUS_CODES.BAD_REQUEST,
          ),
          STATUS_CODES.BAD_REQUEST,
        );
      }
    }
  } catch (error) {
    return createResponse(
      createError(
        "INVALID_JSON",
        error instanceof Error ? error.message : "Invalid JSON in request body",
        STATUS_CODES.BAD_REQUEST,
      ),
      STATUS_CODES.BAD_REQUEST,
    );
  }

  // CHAT ENDPOINTS

  // POST /chat - Send messages to AI
  if (path === "/chat") {
    // Check if the user has permission to write to chat
    const requiredScope = "chat.write" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Validate body contains required messages array
    if (Array.isArray(body["messages"]) && body["messages"].length > 0) {
      const chatResponse = await slopManager.chat.createChat(
        body as unknown as ChatPostRequest,
      );
      return createResponse(chatResponse, STATUS_CODES.OK);
    }
  }

  // POST /chat/stream - Stream responses via SSE
  if (path === "/chat/stream") {
    // First check for scope in header, then in URL for SSE requests
    const url = new URL(request.url);
    const urlScopeHeader = url.searchParams.get(SCOPE_KEY);
    const effectiveScopeHeader = scopeHeader || urlScopeHeader || "";

    // Check if the user has permission to write to chat
    const requiredScope = "chat.write" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, effectiveScopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    try {
      // Validate request body has already been checked
      if (!body || !Array.isArray(body["messages"]) || body["messages"].length === 0) {
        return createResponse(
          createError(
            "INVALID_REQUEST",
            "Request body must contain a messages array",
            STATUS_CODES.BAD_REQUEST,
          ),
          STATUS_CODES.BAD_REQUEST,
        );
      }

      // Create a stream controller to manage the SSE stream
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Start streaming in the background
      (async () => {
        try {
          // Get the user's input
          const userMessage = body && typeof body === "object" &&
              "messages" in body &&
              Array.isArray(body["messages"]) &&
              body["messages"].length > 0 &&
              typeof body["messages"][0] === "object" &&
              body["messages"][0] !== null &&
              "content" in body["messages"][0]
            ? body["messages"][0]["content"]
            : undefined;
          const messageContent = typeof userMessage === "string"
            ? userMessage
            : (userMessage as { text: string })?.text || "";

          // Generate a chat ID
          const chatId = body["thread_id"] ? undefined : generateChatId();

          // Create a sample response (in a real implementation, this would be a call to an LLM)
          const responseText = `This is a sample response to: "${messageContent.substring(0, 30)}${
            messageContent.length > 30 ? "..." : ""
          }"`;

          // Split the response into tokens for streaming
          const tokenChunks = responseText.split(" ");

          // Send event for each token
          for (const token of tokenChunks) {
            const chunk = {
              content: token + " ",
              id: chatId,
              thread_id: body["thread_id"],
            };
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
            );
            // Simulate token-by-token delay (shorter for tests)
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Send completion message
          const completionChunk = {
            status: "complete",
            id: chatId,
            thread_id: body["thread_id"],
          };
          await writer.write(
            encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`),
          );

          // Close the stream
          await writer.close();
        } catch (error) {
          // Handle errors by sending an error event and closing the stream
          const errorChunk = {
            error: error instanceof Error ? error.message : "Error generating response",
          };

          await writer.write(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`),
          );
          await writer.close();
        }
      })();

      // Return the stream with the appropriate headers for SSE
      return createStreamResponse(readable);
    } catch (error) {
      return createResponse(
        createError(
          "STREAM_ERROR",
          error instanceof Error ? error.message : "Stream error",
          STATUS_CODES.INTERNAL_SERVER_ERROR,
        ),
        STATUS_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // TOOLS ENDPOINTS

  // POST /tools/:tool_id - Use a specific tool
  const { tool_id: toolId = "" } = extractPathParams(path, "/tools/:tool_id");
  if (toolId) {
    // Check permission using the optimized tool scope check method
    if (!slopManager.scope.checkToolScope(scopeHeader, toolId)) {
      // The permission wasn't found, now create a helpful error message
      const requiredScope = slopManager.scope.formatScope(
        ResourceType.TOOLS,
        toolId,
        Permission.EXECUTE,
      );
      const errorResponse = createScopeError(requiredScope);

      // Add additional helpful information for safe tools
      if (slopManager.tools.isToolSafe(toolId)) {
        const errorText = errorResponse.error;
        const errorObj = JSON.parse(errorText);
        const enhancedError = {
          ...errorObj,
          error: {
            ...errorObj.error,
            message:
              `${errorObj.error.message}\n\nNote: ${toolId} is marked as a safe tool, so you can also use:
  - tools.safe.${toolId}
  - tools.safe.*`,
          },
        };

        return createResponse(enhancedError, STATUS_CODES.FORBIDDEN);
      }

      return createResponse(errorResponse, STATUS_CODES.FORBIDDEN);
    }

    try {
      const result = await slopManager.tools.executeTool(
        toolId,
        body || {},
      );

      // Check for tool-specific response handling
      const toolResponse = handleToolResponse(toolId, result.result);
      if (toolResponse) {
        return toolResponse;
      }

      // Default response
      return createResponse(result, STATUS_CODES.OK);
    } catch (error) {
      return createResponse(
        createError(
          "TOOL_ERROR",
          error instanceof Error ? error.message : "Tool execution failed",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }
  }

  // MEMORY ENDPOINTS

  // POST /memory - Store a key-value pair
  if (path === "/memory") {
    if (!body || typeof body["key"] !== "string" || body["value"] === undefined) {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "Both key (string) and value are required",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const key = body["key"] as string;
    const value = body["value"] as MemoryValue;

    // Check if the user has permission to write to the memory key
    const requiredScope = `memory.${key}.write` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    const result = slopManager.memory.store(key, value);
    return createResponse(result, STATUS_CODES.OK);
  }

  // POST /memory/query - Search with semantic query
  if (path === "/memory/query") {
    if (!body || typeof body["query"] !== "string") {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "A query is required",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    // Check if the user has permission to read memory
    const requiredScope = "memory..read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    const query = body["query"] as string;
    const limit = typeof body["limit"] === "number" ? body["limit"] : undefined;
    const filter = body["filter"] && typeof body["filter"] === "object"
      ? body["filter"] as {
        key_prefix?: string;
        key_suffix?: string;
        key_contains?: string;
        key_not_contains?: string;
        key_matches?: string;
      }
      : undefined;

    const results = slopManager.memory.query(query, limit, filter);

    return createResponse(results, STATUS_CODES.OK);
  }

  // PAY ENDPOINTS

  // POST /pay - Create a payment
  if (path === "/pay") {
    // Check if the user has permission to execute a payment
    const requiredScope = "pay.execute" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    if (
      !body ||
      typeof body["amount"] !== "number" ||
      typeof body["currency"] !== "string" ||
      typeof body["description"] !== "string" ||
      typeof body["payment_method"] !== "string"
    ) {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "amount (number), currency (string), description (string), and payment_method (string) are required",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    // Validate the payment amount
    if (body["amount"] <= 0) {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "Payment amount must be greater than 0",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    const transaction = slopManager.pay.createPayment(
      body["amount"] as number,
      body["currency"] as string,
      body["description"] as string,
      body["payment_method"] as string,
    );

    return createResponse(transaction, STATUS_CODES.OK);
  }

  return createResponse(
    createError("NOT_FOUND", "Resource not found", STATUS_CODES.NOT_FOUND),
    STATUS_CODES.NOT_FOUND,
  );
}
