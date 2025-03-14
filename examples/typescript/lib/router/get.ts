import {
  ChatId,
  SCOPE_KEY,
  ScopePattern,
  STATUS_CODES,
  ThreadId,
  ToolResponse,
  TransactionId,
} from "../../slop.ts";
import { createScopeError, Permission, ResourceType } from "../Scope.ts";
import { SlopManager } from "../SlopManager.ts";
import { extractPathParams } from "../utils.ts";
import { createError, createResponse } from "./Router.ts";

/**
 * Handle GET requests to various SLOP endpoints
 *
 * Processes GET requests for:
 * - Chat: Get specific chats, threads, or lists of chats/threads
 * - Tools: Get tool details or list available tools
 * - Memory: Get memory values or list keys
 * - Resources: Get resource details or search resources
 * - Pay: Get transaction details
 *
 * @param request - The HTTP request to handle
 * @returns A Promise resolving to the HTTP response
 */
export async function handleGet(request: Request, slopManager: SlopManager): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const scopeHeader = request.headers.get(SCOPE_KEY) || "";

  // TODO: Remove this - just to get the type checker to work
  await void 0;

  // CHAT ENDPOINTS

  // GET /chat/:id - Get a specific chat
  const { id: chatId = "" } = extractPathParams(path, "/chat/:id");
  if (chatId && chatId.startsWith("chat_")) {
    // Check if the user has permission to read the chat
    const requiredScope = `chat.${chatId}.read` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the chat
    const chat = slopManager.chat.getChat(chatId as ChatId);
    if (!chat) {
      return createResponse(
        createError("NOT_FOUND", "Chat not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    // Return the chat
    return createResponse(chat, STATUS_CODES.OK);
  }

  // GET /chat/thread_:id - Get all messages in a thread
  const { id: threadId = "" } = extractPathParams(path, "/chat/thread_:id");
  if (threadId && threadId.startsWith("thread_")) {
    // Check if the user has permission to read the thread
    const requiredScope = `chat.${threadId}.read` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the thread
    const thread = slopManager.chat.getThread(threadId as ThreadId);
    if (!thread) {
      return createResponse(
        createError("NOT_FOUND", "Thread not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    // Return the thread
    return createResponse(thread, STATUS_CODES.OK);
  }

  // GET /chat - List recent chats or threads
  if (path === "/chat") {
    // Check if the user has permission to read chats
    const requiredScope = "chat.read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the type of chat to list
    const type = url.searchParams.get("type");

    // List the chats or threads
    if (type === "threads") {
      const threads = slopManager.chat.listThreads();
      return createResponse(threads, STATUS_CODES.OK);
    } else {
      const chats = slopManager.chat.listChats();
      return createResponse(chats, STATUS_CODES.OK);
    }
  }

  // TOOLS ENDPOINTS

  // GET /tools - List available tools
  if (path === "/tools") {
    // Check if the user has permission to read tools
    const requiredScope = "tools.read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get all tools
    const allTools = slopManager.tools.listTools();

    // If they don't have access to all tools, filter based on permissions
    if (!slopManager.scope.checkPermission("tools.*" as ScopePattern, scopeHeader)) {
      // Filter tools to only show those that the user has permission to use
      const filteredTools = allTools.tools.filter((tool) => {
        // Check if the user has permission to execute this specific tool
        return slopManager.scope.checkToolScope(scopeHeader, tool.id);
      });
      return createResponse({ tools: filteredTools }, STATUS_CODES.OK);
    }

    // Return all tools if the user has full access
    return createResponse(allTools, STATUS_CODES.OK);
  }

  // GET /tools/:tool_id - Get tool details
  const { tool_id: toolId = "" } = extractPathParams(path, "/tools/:tool_id");
  if (toolId) {
    // Check if the user has permission to read the tool
    const requiredScope = slopManager.scope.formatScope(
      ResourceType.TOOLS,
      toolId,
      Permission.READ,
    );
    if (
      !slopManager.scope.checkPermission(requiredScope, scopeHeader) &&
      !slopManager.scope.checkPermission("tools.read" as ScopePattern, scopeHeader) &&
      !slopManager.scope.checkToolScope(scopeHeader, toolId)
    ) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the tool
    const tool = slopManager.tools.getTool(toolId);
    if (!tool) {
      return createResponse(
        createError("NOT_FOUND", "Tool not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    // Create a proper ToolResponse object according to the spec
    const toolResponse: ToolResponse = {
      id: tool.id,
      description: tool.description,
      parameters: {}, // TODO: This would be populated with real schema
      example: tool.example,
    };

    return createResponse({
      ...toolResponse,
      is_safe: slopManager.tools.isToolSafe(tool.id),
    }, STATUS_CODES.OK);
  }

  // MEMORY ENDPOINTS

  // GET /memory - List all keys
  if (path === "/memory") {
    // Check if the user has permission to read memory
    const requiredScope = "memory..read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }
    // List all keys
    const keys = slopManager.memory.listKeys();
    return createResponse(keys, STATUS_CODES.OK);
  }

  // GET /memory/:key - Get value by key
  const { key: memoryKey = "" } = extractPathParams(path, "/memory/:key");
  if (memoryKey) {
    // Check if the user has permission to read the memory key
    const requiredScope = `memory.${memoryKey}.read` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the value
    const value = slopManager.memory.getValue(memoryKey);
    if (!value) {
      return createResponse(
        createError("NOT_FOUND", "Memory key not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    return createResponse(value, STATUS_CODES.OK);
  }

  // RESOURCES ENDPOINTS

  // GET /resources - List available resources
  if (path === "/resources") {
    // Check if the user has permission to read resources
    const requiredScope = "resources.list.read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // List all resourcess
    const resources = slopManager.resources.listResources();
    return createResponse(resources, STATUS_CODES.OK);
  }

  // GET /resources/search - Search resources
  if (url.pathname === "/resources/search") {
    // Check if the user has permission to read resources
    const requiredScope = "resources.search.read" as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the query
    const query = url.searchParams.get("q");
    if (!query) {
      return createResponse(
        createError(
          "INVALID_REQUEST",
          "Query parameter 'q' is required",
          STATUS_CODES.BAD_REQUEST,
        ),
        STATUS_CODES.BAD_REQUEST,
      );
    }

    try {
      const searchResponse = slopManager.resources.search(query);
      return createResponse(searchResponse, STATUS_CODES.OK);
    } catch (error) {
      return createResponse(
        createError(
          "SEARCH_ERROR",
          error instanceof Error ? error.message : "Search error",
          STATUS_CODES.INTERNAL_SERVER_ERROR,
        ),
        STATUS_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GET /resources/:id - Get a specific resource
  const { resource_id: resourceId = "" } = extractPathParams(path, "/resources/:resource_id");
  if (resourceId) {
    // Check if the user has permission to read the resource
    const requiredScope = `resources.${resourceId}.read` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the resource
    const resource = slopManager.resources.getResource(resourceId);
    if (!resource) {
      return createResponse(
        createError("NOT_FOUND", "Resource not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    return createResponse(resource, STATUS_CODES.OK);
  }

  // PAY ENDPOINTS

  // GET /pay/:id - Get payment status
  const { id: transactionId = "" } = extractPathParams(path, "/pay/:id");
  if (transactionId && transactionId.startsWith("tx_")) {
    // Check if the user has permission to read the transaction
    const requiredScope = `pay.${transactionId}.read` as ScopePattern;
    if (!slopManager.scope.checkPermission(requiredScope, scopeHeader)) {
      return createResponse(createScopeError(requiredScope), STATUS_CODES.FORBIDDEN);
    }

    // Get the transaction
    const transaction = slopManager.pay.getTransaction(transactionId as TransactionId);
    if (!transaction) {
      return createResponse(
        createError("NOT_FOUND", "Transaction not found", STATUS_CODES.NOT_FOUND),
        STATUS_CODES.NOT_FOUND,
      );
    }

    return createResponse(transaction, STATUS_CODES.OK);
  }

  // If we reach here, the endpoint doesn't exist
  return createResponse(
    createError("NOT_FOUND", "Endpoint not found", STATUS_CODES.NOT_FOUND),
    STATUS_CODES.NOT_FOUND,
  );
}
