import { ChatManager } from "./Chat.ts";
import { MemoryManager } from "./Memory.ts";
import { PayManager } from "./Pay.ts";
import { ResourceManager } from "./Resources.ts";
import { createError, createResponse, Router } from "./router/Router.ts";
import { ScopeManager } from "./Scope.ts";
import { ToolManager } from "./Tools.ts";
import { STATUS_CODES } from "../slop.ts";

/**
 * Implements the Simple Language Open Protocol (SLOP) specification,
 * providing standardized endpoints for:
 * - Chat: Create and manage chat conversations with LLMs
 * - Tools: Define and execute tools that can be used by LLMs
 * - Memory: Store and retrieve key-value pairs
 * - Resources: Manage resources that can be referenced by LLMs
 * - Pay: Handle payments and transactions
 */
export class SlopManager {
  /** Manages chat conversations and message history */
  chat: ChatManager;

  /** Manages key-value storage */
  memory: MemoryManager;

  /** Manages payment processing */
  pay: PayManager;

  /** Manages resource content and metadata */
  resources: ResourceManager;

  /** Manages scope-based permissions */
  scope: ScopeManager;

  /** Manages tool definitions and execution */
  tools: ToolManager;

  /**
   * Manages routing requests
   * @private
   */
  #router: Router;

  /**
   * Creates a new SlopManager instance with all required managers
   */
  constructor() {
    this.chat = new ChatManager();
    this.memory = new MemoryManager();
    this.pay = new PayManager();
    this.resources = new ResourceManager();
    this.scope = new ScopeManager();
    this.tools = new ToolManager();

    this.#router = new Router(this);
  }

  /**
   * Universal request handler
   *
   * Automatically detects the request type and routes it to the appropriate handler:
   * - WebSocket upgrade requests
   * - Server-Sent Events stream requests
   * - Regular HTTP requests
   *
   * Usage:
   * ```typescript
   * const slopManager = new SlopManager();
   * Deno.serve((req) => slopManager.handler(req));
   * ```
   */
  handler = (request: Request): Promise<Response> => {
    try {
      // Handle WebSocket upgrade request
      if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
        const url = new URL(request.url);
        const path = url.pathname;

        // Only handle WebSocket connections for chat
        if (path === "/chat/ws") {
          const { socket, response } = Deno.upgradeWebSocket(request);
          const scopeHeader = request.headers.get("X-SLOP-SCOPE") ||
            url.searchParams.get("X-SLOP-SCOPE") ||
            "";

          this.#router.handleWebSocketConnection(socket, scopeHeader);
          return Promise.resolve(response);
        }

        // Reject other WebSocket paths
        return Promise.resolve(createResponse(
          createError(
            "WEBSOCKET_ERROR",
            "WebSocket connections are only supported for /chat/ws",
            STATUS_CODES.FORBIDDEN,
          ),
          STATUS_CODES.FORBIDDEN,
        ));
      }

      // Handle SSE stream request
      const url = new URL(request.url);
      if (url.pathname === "/chat/stream" && request.method === "POST") {
        return this.#router.handleSSEStream(request);
      }

      // Handle regular HTTP requests
      return this.#router.handleHttpRequest(request);
    } catch (error) {
      const processedError = error instanceof Error ? error : String(error);
      return Promise.resolve(createResponse(processedError));
    }
  };
}
