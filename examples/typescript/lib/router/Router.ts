import type {
  ChatPostRequest,
  ErrorResponse,
  ScopeErrorResponse,
  ScopePattern,
} from "../../slop.ts";
import { SCOPE_KEY, STATUS_CODES } from "../../slop.ts";
import { createScopeError } from "../Scope.ts";
import type { SlopManager } from "../SlopManager.ts";
import { handleDelete } from "./delete.ts";
import { handleGet } from "./get.ts";
import { handlePost } from "./post.ts";
import { handlePut } from "./put.ts";

/**
 * Creates a Response object with the correct headers and status code
 * @param body The response body
 * @param status The HTTP status code
 * @returns A properly formatted Response object
 */
export function createResponse<T>(
  body: T,
  status: number = STATUS_CODES.OK,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Creates a binary Response object with the correct headers and status code
 * @param data The binary data to return
 * @param contentType The MIME type of the data
 * @param headers Additional headers to include
 * @param status The HTTP status code
 * @returns A properly formatted binary Response object
 */
export function createBinaryResponse(
  data: Uint8Array,
  contentType: string,
  headers: Record<string, string> = {},
  status: number = STATUS_CODES.OK,
): Response {
  return new Response(data, {
    status,
    headers: {
      "Content-Type": contentType,
      ...headers,
    },
  });
}

/**
 * Creates a streaming Response object with the correct headers for SSE
 * @param stream The readable stream to send
 * @param headers Additional headers to include
 * @returns A properly formatted SSE Response object
 */
export function createStreamResponse(
  stream: ReadableStream,
  headers: Record<string, string> = {},
): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      ...headers,
    },
  });
}

/**
 * Creates a standard SLOP error object
 *
 * @param code Machine-readable error code
 * @param message Error message describing what went wrong
 * @param status HTTP status code
 * @returns A properly formatted ErrorResponse object
 */
export function createError(
  code: string = "SERVER_ERROR",
  message: string,
  status: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
): ErrorResponse {
  return {
    error: {
      code,
      message,
      status,
    },
  };
}

/**
 * Creates a standard error from an Error object or string
 *
 * @param error Error object or string message
 * @param code Optional error code
 * @param status Optional HTTP status code
 * @returns A properly formatted ErrorResponse object
 */
export function createErrorFromException(
  error: Error | string,
  code: string = "SERVER_ERROR",
  status: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
): ErrorResponse {
  const message = error instanceof Error ? error.message : String(error);
  return createError(code, message, status);
}

/**
 * Handler for WebSocket message events
 * This function processes incoming WebSocket messages and sends back appropriate responses
 *
 * @param socket The WebSocket connection to handle messages for
 * @param slopManager The SlopManager instance
 * @param scopeHeader Optional scope header for permission checks
 * @returns An async function that processes MessageEvent objects
 */
function socketOnMessage(socket: WebSocket, slopManager: SlopManager, scopeHeader: string = "") {
  return (async (event: MessageEvent) => {
    try {
      // Parse the message
      const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (!message || typeof message !== "object") {
        const errorResponse: ErrorResponse = createError(
          "INVALID_MESSAGE",
          "Invalid message format. Expected JSON object.",
          STATUS_CODES.BAD_REQUEST,
        );
        socket.send(JSON.stringify(errorResponse));
        return;
      }

      // Handle chat messages
      if (message.type === "chat") {
        // Check if the client has the required scope
        if (!slopManager.scope.checkPermission("chat.write" as ScopePattern, scopeHeader)) {
          const errorResponse: ScopeErrorResponse = createScopeError("chat.write" as ScopePattern);
          socket.send(JSON.stringify(errorResponse));
          return;
        }

        // Extract parameters from the request
        const { messages, thread_id, model } = message;

        try {
          // Create a streaming chat response using ChatManager
          const chatStream = slopManager.chat.createStreamingChat({
            messages,
            thread_id,
            model,
          });

          // Process the stream and send tokens
          const reader = chatStream.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done || !socket || socket.readyState !== WebSocket.OPEN) {
                break;
              }

              // Send the token to the client
              socket.send(JSON.stringify(value));
            }
          } catch (streamError) {
            console.error("Error reading from chat stream:", streamError);
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                error: {
                  code: "STREAM_ERROR",
                  message: streamError instanceof Error
                    ? streamError.message
                    : "Stream processing error",
                  status: STATUS_CODES.INTERNAL_SERVER_ERROR,
                },
              }));
            }
          } finally {
            reader.releaseLock();
          }
        } catch (chatError) {
          if (socket.readyState === WebSocket.OPEN) {
            const errorResponse: ErrorResponse = {
              error: {
                code: "GENERATION_ERROR",
                message: chatError instanceof Error
                  ? chatError.message
                  : "Error generating response",
                status: STATUS_CODES.INTERNAL_SERVER_ERROR,
              },
            };

            socket.send(JSON.stringify(errorResponse));
          }
        }
      }
    } catch (error) {
      // Send error response to the client
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorResponse = createError(
        "WEBSOCKET_ERROR",
        errorMsg,
        STATUS_CODES.INTERNAL_SERVER_ERROR,
      );
      socket.send(JSON.stringify(errorResponse));
    }
  });
}

export class Router {
  #slopManager: SlopManager;

  constructor(server: SlopManager) {
    this.#slopManager = server;
  }

  /**
   * Handle HTTP requests based on the method
   *
   * This method handles HTTP requests based on the request method
   * and returns a response based on the request method.
   *
   * @param request - The HTTP request to handle
   * @returns A Promise resolving to the HTTP response
   */
  handleHttpRequest(request: Request): Promise<Response> {
    try {
      switch (request.method) {
        case "GET":
          return handleGet(request, this.#slopManager);
        case "POST":
          return handlePost(request, this.#slopManager);
        case "PUT":
          return handlePut(request, this.#slopManager);
        case "DELETE":
          return handleDelete(request, this.#slopManager);
        default:
          return Promise.resolve(
            createResponse(
              createError(
                "METHOD_NOT_ALLOWED",
                "Method not allowed",
                STATUS_CODES.FORBIDDEN,
              ),
              STATUS_CODES.FORBIDDEN,
            ),
          );
      }
    } catch (error) {
      const processedError = error instanceof Error ? error : String(error);
      return Promise.resolve(createResponse(processedError));
    }
  }

  /**
   * Handle Server-Sent Events (SSE) streaming for chat messages
   *
   * SSE provides a lightweight, one-directional streaming mechanism
   * that's ideal for streaming AI responses token by token.
   * This implementation follows the SLOP specification for SSE streaming.
   *
   * @param request - The HTTP request for the SSE stream
   * @returns Response object with SSE stream setup
   */
  async handleSSEStream(request: Request): Promise<Response> {
    try {
      // Clone the request before reading the body to avoid "already read" errors
      const clonedRequest = request.clone();

      // Parse the request body
      const body = await clonedRequest.json() as ChatPostRequest;

      // Validate proper message format
      if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
        return createResponse(
          createError(
            "INVALID_REQUEST",
            "Invalid message format: messages array required",
            STATUS_CODES.BAD_REQUEST,
          ),
          STATUS_CODES.BAD_REQUEST,
        );
      }

      // Validate scope
      const url = new URL(request.url);
      const scopeHeader = request.headers.get(SCOPE_KEY) || url.searchParams.get(SCOPE_KEY) || "";

      // Check if the user has permission to write to chat
      const requiredScope = "chat.write" as ScopePattern;
      if (!this.#slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
        return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
      }

      // Create stream and pipe through TransformStream for SSE formatting
      const chatStream = this.#slopManager.chat.createStreamingChat(body);
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Process tokens from chatStream and format as SSE
      (async () => {
        const reader = chatStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Format as SSE data
            await writer.write(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
          }
        } catch (error) {
          // Send error event
          const errorObj: ErrorResponse = {
            error: {
              code: "GENERATION_ERROR",
              message: error instanceof Error ? error.message : "Error generating response",
              status: STATUS_CODES.INTERNAL_SERVER_ERROR,
            },
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(errorObj)}\n\n`));
        } finally {
          writer.close();
        }
      })();

      // Return the stream with proper headers
      return createStreamResponse(readable);
    } catch (error) {
      const processedError = error instanceof Error ? error : String(error);
      return createResponse(processedError);
    }
  }

  /**
   * Handle WebSocket connections for chat streaming
   *
   * This implements the WebSocket protocol for real-time bidirectional communication
   * following the SLOP specification. WebSockets provide a persistent connection
   * for streaming responses, allowing for token-by-token delivery.
   *
   * @param socket - WebSocket instance to handle
   * @param scopeHeader - The scope header to use for permission checks
   */
  handleWebSocketConnection(socket: WebSocket, scopeHeader: string): Promise<void> {
    // Set message handler with the SlopManager instance
    socket.onmessage = socketOnMessage(socket, this.#slopManager, scopeHeader);

    // Handle errors
    socket.onerror = (event) => {
      console.error("WebSocket error:", event);

      // Try to send an error message if the socket is still open
      if (socket.readyState === WebSocket.OPEN) {
        const errorResponse: ErrorResponse = {
          error: {
            code: "WEBSOCKET_ERROR",
            message: "WebSocket connection encountered an error",
            status: STATUS_CODES.INTERNAL_SERVER_ERROR,
          },
        };

        socket.send(JSON.stringify(errorResponse));
      }
    };

    // Handle connection close
    socket.onclose = () => {
      // Clean up any resources associated with this socket
      console.log("WebSocket connection closed");
    };

    // Send a welcome message to confirm connection
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        connection: "established",
        protocol: "SLOP WebSocket",
        message: "Connected to SLOP-compliant server",
        scope_active: scopeHeader ? true : false,
      }));
    }

    return Promise.resolve();
  }
}
