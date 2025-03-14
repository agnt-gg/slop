/**
 * @module SLOP-TS
 * @description A TypeScript implementation of the SLOP (Simple Language Open Protocol) pattern
 *
 * SLOP is a simple, open pattern for AI APIs with standardized endpoints:
 * - Standard REST API with JSON data
 * - Core endpoints: /chat, /tools, /memory, /resources, /pay
 * - Support for streaming via SSE and WebSockets
 * - Scope-based permission system for security
 *
 * This module provides TypeScript type definitions and constants for implementing
 * SLOP-compatible clients and servers.
 *
 * @author {SLOP-TS} P. Hughes <https://github.com/phughesmcr>
 * @author {SLOP} agnt-gg <https://github.com/agnt-gg>
 * @see https://github.com/agnt-gg/slop
 * @version 0.0.1
 * @license MIT
 *
 * For an example server implementation, see `./local-server.ts`
 * For an example client implementation, see `./local-client.ts`
 */

//#region CONSTANTS

/**
 * Standard HTTP status codes used in SLOP responses
 *
 * These status codes follow standard HTTP conventions and are used
 * to provide consistent error reporting across SLOP implementations.
 */
export const STATUS_CODES = {
  /** 200: Success */
  "OK": 200,
  /** 400: Invalid request format or parameters */
  "BAD_REQUEST": 400,
  /** 401: Authentication required */
  "UNAUTHORIZED": 401,
  /** 403: Valid authentication but insufficient permissions */
  "FORBIDDEN": 403,
  /** 404: Resource not found */
  "NOT_FOUND": 404,
  /** 429: Rate limit exceeded */
  "TOO_MANY_REQUESTS": 429,
  /** 500: Server encountered an error */
  "INTERNAL_SERVER_ERROR": 500,
} as const;

/**
 * Standard HTTP status codes used in SLOP responses
 *
 * These status codes follow standard HTTP conventions and are used
 * to provide consistent error reporting across SLOP implementations.
 */
export const STATUS_ERRORS = {
  200: "OK",
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
} as const;

/**
 * Standard HTTP header key for SLOP scope permissions
 *
 * This header is used to pass permission scopes with requests,
 * allowing fine-grained control over API access.
 *
 * Example: `X-SLOP-SCOPE: chat.read,tools.calculator.execute`
 */
export const SCOPE_KEY = "X-SLOP-SCOPE" as const;

//#endregion

//#region ERRORS

/**
 * Standard SLOP error object structure
 *
 * This type defines the standard format for error objects returned
 * by SLOP endpoints when an error occurs.
 */
export type SlopError = {
  /** Machine-readable error code (e.g., "NOT_FOUND", "INVALID_PARAMETER") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** The HTTP status code associated with this error */
  status: number;
};

/**
 * Standard API error response envelope
 *
 * This interface defines the JSON structure for error responses
 * returned by SLOP endpoints.
 *
 * @example
 * ```json
 * {
 *   "error": {
 *     "code": "INVALID_REQUEST",
 *     "message": "The 'messages' field is required",
 *     "status": 400
 *   }
 * }
 * ```
 */
export interface ErrorResponse {
  error: SlopError;
}

/**
 * Specialized error response for scope permission violations
 *
 * This interface defines the JSON structure returned when a
 * request is made without the required scope permissions.
 *
 * @example
 * ```json
 * {
 *   "error": "Scope violation: tools.system.execute requires explicit permission",
 *   "permitted": false
 * }
 * ```
 */
export interface ScopeErrorResponse {
  /** Human-readable error message explaining the scope violation */
  error: string;
  /** Always false, indicating the request was not permitted due to scope restrictions */
  permitted: false;
}

//#endregion

//#region CHAT

/**
 * A unique identifier for a chat conversation
 *
 * In SLOP, chat IDs follow a standardized format with the 'chat_' prefix
 * followed by a unique string (typically a UUID or similar).
 *
 * @example 'chat_123456789abcdef'
 */
export type ChatId = `chat_${string}`;

/**
 * A unique identifier for a chat message
 *
 * In SLOP, message IDs follow a standardized format with the 'msg_' prefix
 * followed by a unique string (typically a UUID or similar).
 *
 * @example 'msg_123456789abcdef'
 */
export type MessageId = `msg_${string}`;

/**
 * A unique identifier for a chat thread
 *
 * In SLOP, thread IDs follow a standardized format with the 'thread_' prefix
 * followed by a unique string (typically a UUID or similar).
 *
 * @example 'thread_123456789abcdef'
 */
export type ThreadId = `thread_${string}`;

/**
 * URL parameters for GET /chat/:id endpoint
 *
 * Used when retrieving a specific chat by its ID.
 */
export interface ChatGetParams {
  /** The unique identifier of the chat to retrieve */
  id: ChatId;
}

/**
 * URL parameters for GET /chat/thread_:id endpoint
 *
 * Used when retrieving all messages in a specific thread.
 */
export interface ChatThreadGetParams {
  /** The unique identifier of the thread to retrieve */
  id: ThreadId;
}

/**
 * Query parameters for GET /chat endpoint
 *
 * Used to filter the list of chats, for example to retrieve threads instead.
 *
 * @example GET /chat?type=threads
 */
export interface ChatListParams {
  /** When set to "threads", returns a list of threads instead of individual chats */
  type?: "threads";
}

/**
 * Standard chat message roles
 *
 * These roles are compatible with OpenAI-style chat APIs and define
 * the sender of each message in a conversation.
 */
export type ChatCompletionRole =
  /** System instructions or context */
  | "system"
  /** End-user message */
  | "user"
  /** AI assistant response */
  | "assistant"
  /** Message from a developer or administrator */
  | "developer"
  /** Message from a tool or function call */
  | "tool"
  /** Output from a function execution */
  | "function";

/**
 * Standard chat message structure
 *
 * Represents a single message in a chat conversation, compatible with
 * OpenAI-style chat APIs.
 *
 * @example
 * ```json
 * {
 *   "role": "user",
 *   "content": "Hello, what's the weather like today?"
 * }
 * ```
 */
/**
 * Individual content block in a message
 *
 * A content block can be text, image, file, or other media type
 */
export interface ChatContentBlock {
  /** Type of content block */
  type: "text" | "image" | "file" | "code" | "table" | "data" | string;
  /** Text content (for text blocks) */
  text?: string;
  /** Image URL or base64 data (for image blocks) */
  image_url?: string;
  /** File URL or base64 data (for file blocks) */
  file_url?: string;
  /** MIME type of the content */
  mime_type?: string;
  /** Additional attributes for this content block */
  attributes?: Record<string, unknown>;
}

/**
 * Content of a chat message
 *
 * Can be a string, an object with text property, or an array of content blocks
 */
export type MessageContent =
  | string
  | { text: string }
  | { type: string; text?: string; [key: string]: unknown }
  | ChatContentBlock
  | ChatContentBlock[];

export interface ChatMessage {
  /** The role of the message sender */
  role: ChatCompletionRole;
  /**
   * The content of the message, which can be a string or a structured content object
   */
  content: MessageContent;
  /** Optional name identifier for the sender, for OpenAI-type API compatibility */
  name?: string;
}

/**
 * Chat message with additional metadata
 *
 * Extends the basic ChatMessage with server-added metadata like unique ID
 * and creation timestamp. Used in responses that include message history.
 */
export interface ChatMessageWithMetadata extends ChatMessage {
  /** Unique identifier for this specific message */
  id: string;
  /** ISO 8601 timestamp indicating when the message was created */
  created_at: string;
}

/**
 * Chat metadata for list responses
 *
 * Provides a summary of a chat conversation for list views, without
 * including the full message content.
 */
export interface ChatMetadata {
  /** Unique identifier for the chat */
  id: ChatId;
  /** A short preview of the chat content */
  snippet: string;
  /** ISO 8601 timestamp indicating when the chat was created */
  created_at: string;
}

/**
 * Response for GET /chat endpoint
 *
 * Returns a list of recent chat conversations with summary information.
 *
 * @example
 * ```json
 * {
 *   "chats": [
 *     {
 *       "id": "chat_123",
 *       "snippet": "Hello, what's the weather like?",
 *       "created_at": "2023-05-15T10:30:00Z"
 *     }
 *   ]
 * }
 * ```
 */
export interface ChatListResponse {
  /** Array of chat metadata summaries */
  chats: ChatMetadata[];
}

/**
 * Request for POST /chat endpoint
 *
 * Used to send messages to the AI and receive responses.
 *
 * @example
 * ```json
 * {
 *   "messages": [
 *     {"role": "user", "content": "Hello, what's the weather like?"}
 *   ],
 *   "model": "gpt-4"
 * }
 * ```
 */
export interface ChatPostRequest {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** The AI model to use for generating the response */
  model?: string;
  /**
   * Optional thread identifier. If provided, the message will be added to an existing thread
   * or create a new thread with this ID.
   */
  thread_id?: ThreadId;
}

/**
 * Request for POST /chat/stream endpoint
 *
 * Used to request streaming responses from the AI, with responses
 * delivered token-by-token via Server-Sent Events (SSE).
 */
export interface ChatPostStreamRequest extends ChatPostRequest {
  /** Must be set to true to enable streaming */
  stream: true;
}

/**
 * Single token response for streaming
 *
 * Represents a single token in a streaming response.
 */
export interface ChatStreamToken {
  /** The text content of this token */
  content: string;
}

/**
 * Standard streaming response format
 *
 * Used for both SSE and WebSocket streaming responses. During streaming,
 * most responses will only contain the content field, with the ID fields
 * potentially included only in the initial or final messages.
 */
export interface ChatStreamResponse {
  /** Optional chat ID, may only be included in initial or final response */
  id?: ChatId;
  /** Optional thread ID, may only be included in initial or final response */
  thread_id?: ThreadId;
  /** The text content of this token */
  content: string;
}

/**
 * Streaming completion status
 *
 * Indicates that a streaming response has completed. The format varies
 * slightly between SSE (which uses "[DONE]") and WebSocket (which uses
 * a status object).
 */
export interface ChatStreamComplete {
  /**
   * Status indicator:
   * - "complete" is used for WebSocket streams
   * - "done" is used conceptually for SSE, though typically sent as "[DONE]"
   */
  status: "complete" | "done";
}

/**
 * Base response format for chat requests
 *
 * Contains the common fields returned by the POST /chat endpoint.
 */
interface ChatPostResponseBase {
  /** The AI model's response message */
  message: ChatMessage;
}

/**
 * Response for POST /chat (without thread_id)
 *
 * Returned when a new standalone chat is created.
 *
 * @example
 * ```json
 * {
 *   "id": "chat_123",
 *   "message": {
 *     "role": "assistant",
 *     "content": "I don't have real-time weather data."
 *   }
 * }
 * ```
 */
export interface ChatPostResponse extends ChatPostResponseBase {
  /** Unique identifier for the newly created chat */
  id: ChatId;
}

/**
 * Response for GET /chat/:id
 *
 * Returns a complete chat conversation including all messages.
 *
 * @example
 * ```json
 * {
 *   "id": "chat_123",
 *   "messages": [
 *     {"role": "user", "content": "Hello, what's the weather like?"},
 *     {"role": "assistant", "content": "I don't have real-time weather data."}
 *   ],
 *   "created_at": "2023-05-15T10:30:00Z",
 *   "model": "gpt-4"
 * }
 * ```
 */
export interface ChatGetByIdResponse extends ChatPostResponse {
  /** Complete message history for this chat */
  messages: ChatMessageWithMetadata[];
  /** ISO 8601 timestamp of when the chat was created */
  created_at: string;
  /** The AI model used for this chat */
  model: string;
}

/**
 * Response for POST /chat (with thread_id)
 *
 * Returned when a message is added to an existing thread or a new thread is created.
 *
 * @example
 * ```json
 * {
 *   "thread_id": "thread_123",
 *   "message": {
 *     "role": "assistant",
 *     "content": "How can I help you with the project?"
 *   }
 * }
 * ```
 */
export interface ChatPostThreadResponse extends ChatPostResponseBase {
  /** Identifier for the thread this message was added to */
  thread_id: ThreadId;
}

/**
 * Thread summary information
 *
 * Used in list responses to provide an overview of available threads.
 */
export interface ChatThread {
  /** Unique identifier for this thread */
  id: ThreadId;
  /** Human-readable title for the thread, typically derived from the first message */
  title: string;
  /** Preview of the most recent message in the thread */
  last_message: string;
  /** ISO 8601 timestamp of when the thread was created */
  created_at: string;
  /** ISO 8601 timestamp of when the thread was last updated */
  updated_at: string;
}

/**
 * Response for GET /chat?type=threads
 *
 * Returns a list of available conversation threads.
 *
 * @example
 * ```json
 * {
 *   "threads": [
 *     {
 *       "id": "thread_123",
 *       "title": "Project Planning",
 *       "last_message": "What's our next milestone?",
 *       "created_at": "2023-05-15T10:30:00Z",
 *       "updated_at": "2023-05-15T11:45:00Z"
 *     }
 *   ]
 * }
 * ```
 */
export interface ChatThreadListResponse {
  /** Array of thread summaries */
  threads: ChatThread[];
}

/**
 * Response for GET /chat/thread_:id
 *
 * Returns the complete message history for a specific thread.
 *
 * @example
 * ```json
 * {
 *   "thread_id": "thread_123",
 *   "title": "Project Planning",
 *   "messages": [
 *     {"role": "user", "content": "Let's discuss project planning"},
 *     {"role": "assistant", "content": "Sure, what aspects of the project would you like to plan?"}
 *   ],
 *   "model": "gpt-4",
 *   "created_at": "2023-05-15T10:30:00Z",
 *   "updated_at": "2023-05-15T11:45:00Z"
 * }
 * ```
 */
export interface ChatThreadResponse {
  /** Unique identifier for this thread */
  thread_id: ThreadId;
  /** Human-readable title for the thread */
  title: string;
  /** Complete message history for this thread */
  messages: ChatMessageWithMetadata[];
  /** The AI model used for this thread */
  model: string;
  /** ISO 8601 timestamp of when the thread was created */
  created_at: string;
  /** ISO 8601 timestamp of when the thread was last updated */
  updated_at: string;
}

//#endregion

//#region TOOLS

/**
 * A functional tool that can be used in the SLOP pattern
 *
 * Tools provide capabilities for AI assistants to interact with external
 * systems and perform actions on behalf of users.
 */
export interface Tool {
  /** Unique identifier for the tool */
  id: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Example usage of the tool */
  example?: string;
  /** Parameter definitions for the tool */
  parameters?: Record<string, ToolParameter>;
  /**
   * Function that executes the tool's functionality
   * @param params The parameters passed to the tool
   * @returns Result of the tool execution
   */
  execute: (
    params: Record<string, unknown>,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

/**
 * URL parameters for GET /tools/:tool_id endpoint
 *
 * Used when retrieving information about a specific tool.
 */
export interface ToolGetParams {
  /** The unique identifier of the tool to retrieve */
  tool_id: string;
}

/**
 * Tool parameter schema definition
 *
 * Defines a single parameter for a tool. Includes type information,
 * validation rules, and description. Compatible with JSON Schema.
 */
export interface ToolParameter {
  /** The expected data type of this parameter */
  type: "string" | "number" | "boolean" | "object" | "array" | "null" | "integer";
  /** Human-readable description of the parameter */
  description: string;
  /** Whether the parameter is required */
  required?: boolean;
  /** Default value if parameter is not provided */
  default?: unknown;
  /** Whether null is an acceptable value */
  nullable?: boolean;

  // String-specific validations
  /** Minimum length for string values */
  minLength?: number;
  /** Maximum length for string values */
  maxLength?: number;
  /** Regular expression pattern for string validation */
  pattern?: string;
  /** Format hint (e.g., "email", "uri", "date-time") */
  format?: string;

  // Number-specific validations
  /** Minimum value for numeric parameters */
  minimum?: number;
  /** Maximum value for numeric parameters */
  maximum?: number;
  /** Whether the minimum value is exclusive */
  exclusiveMinimum?: boolean;
  /** Whether the maximum value is exclusive */
  exclusiveMaximum?: boolean;
  /** Multiple of value (e.g., 5 for multiples of 5) */
  multipleOf?: number;

  // Array-specific validations
  /** Schema for array items */
  items?: ToolParameter;
  /** Minimum number of items in array */
  minItems?: number;
  /** Maximum number of items in array */
  maxItems?: number;
  /** Whether array items must be unique */
  uniqueItems?: boolean;

  // Object-specific validations
  /** Schema for object properties */
  properties?: Record<string, ToolParameter>;
  /** Whether additional properties are allowed */
  additionalProperties?: boolean;
  /** Required properties for objects */
  requiredProperties?: string[];

  // Enum validations (for any type)
  /** List of allowed values */
  enum?: (string | number | boolean)[];
}

/**
 * Tool parameters schema definition
 *
 * Defines the expected parameters for a tool, including their types
 * and descriptions. Compatible with JSON Schema and OpenAI-style function calling.
 */
export type ToolParameters =
  | string // Simple string schema (for backward compatibility)
  | Record<string, ToolParameter>;

/**
 * Tool schema definition for API responses
 *
 * Provides a description of a tool and its expected parameters.
 * Used in responses to the GET /tools and GET /tools/:tool_id endpoints.
 *
 * @example
 * ```json
 * {
 *   "id": "calculator",
 *   "description": "Performs mathematical calculations",
 *   "parameters": {
 *     "expression": {
 *       "type": "string",
 *       "description": "Mathematical expression to evaluate"
 *     }
 *   },
 *   "example": "15 * 7"
 * }
 * ```
 */
export interface ToolSchema {
  /** Unique identifier for the tool */
  id: string;
  /** Human-readable description of what the tool does */
  description?: string;
  /** Schema for the parameters expected by this tool */
  parameters: ToolParameters;
  /** Example usage of the tool */
  example?: string;
}

/**
 * Response for GET /tools endpoint
 *
 * Returns a list of available tools and their schemas.
 *
 * @example
 * ```json
 * {
 *   "tools": [
 *     {
 *       "id": "calculator",
 *       "description": "Performs mathematical calculations",
 *       "parameters": {
 *         "expression": {
 *           "type": "string",
 *           "description": "Mathematical expression to evaluate"
 *         }
 *       }
 *     },
 *     {
 *       "id": "weather",
 *       "description": "Gets current weather",
 *       "parameters": {
 *         "location": {
 *           "type": "string",
 *           "description": "City or location name"
 *         }
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export interface ToolListResponse {
  /** Array of available tools with their schemas */
  tools: ToolSchema[];
}

/**
 * Response for GET /tools/:tool_id endpoint
 *
 * Returns detailed schema information for a specific tool.
 */
export interface ToolResponse extends ToolSchema {}

/**
 * Request for POST /tools/:tool_id endpoint
 *
 * Generic type for tool execution requests. The actual parameters
 * will depend on the specific tool being executed.
 *
 * @example
 * ```json
 * // For calculator tool
 * {
 *   "expression": "15 * 7"
 * }
 * ```
 */
export type ToolExecuteRequest<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

/**
 * Response for POST /tools/:tool_id endpoint
 *
 * Contains the result of executing a tool. The actual structure
 * of the result depends on the specific tool that was executed.
 *
 * @example
 * ```json
 * {
 *   "result": 105
 * }
 * ```
 */
export interface ToolExecuteResponse {
  /** Result returned by the tool execution */
  result: unknown;
}

//#endregion

//#region MEMORY

/**
 * Status codes for memory operations
 *
 * These status codes indicate the result of operations on memory entries.
 */
export type MemoryResponseStatus =
  /** Entry was successfully created */
  | "stored"
  /** Existing entry was successfully modified */
  | "updated"
  /** Entry was successfully removed */
  | "deleted";

/**
 * Allowed value types for memory storage
 *
 * Memory values can be primitive types or structured objects.
 */
export type MemoryValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

/**
 * Request for POST /memory endpoint
 *
 * Used to store a new key-value pair in memory.
 *
 * @example
 * ```json
 * {
 *   "key": "user_preference",
 *   "value": {
 *     "theme": "dark",
 *     "language": "en"
 *   }
 * }
 * ```
 */
export interface MemoryPostRequest {
  /** The unique key to store the value under */
  key: string;
  /** The value to be stored */
  value: MemoryValue;
}

/**
 * Response for POST /memory endpoint
 *
 * Confirms that a value was successfully stored in memory.
 *
 * @example
 * ```json
 * {
 *   "status": "stored"
 * }
 * ```
 */
export interface MemoryStoreResponse {
  /** Indicates the operation completed successfully */
  status: "stored";
}

/**
 * Response for GET /memory endpoint
 *
 * Returns a list of all keys stored in memory with their creation timestamps.
 *
 * @example
 * ```json
 * {
 *   "keys": [
 *     {
 *       "key": "user_preference",
 *       "created_at": "2023-05-15T10:30:00Z"
 *     },
 *     {
 *       "key": "search_history",
 *       "created_at": "2023-05-14T14:20:00Z"
 *     }
 *   ]
 * }
 * ```
 */
export interface MemoryKeyListResponse {
  /** Array of stored memory keys and their creation times */
  keys: Array<{
    /** The unique key identifier */
    key: string;
    /** ISO 8601 timestamp of when the key was first created */
    created_at: string;
  }>;
}

/**
 * URL parameters for GET /memory/:key endpoint
 *
 * Used when retrieving a specific memory value by its key.
 */
export interface MemoryGetByKeyParams {
  /** The key of the memory value to retrieve */
  key: string;
}

/**
 * Response for GET /memory/:key endpoint
 *
 * Returns a specific memory value and its metadata.
 *
 * @example
 * ```json
 * {
 *   "key": "user_preference",
 *   "value": {
 *     "theme": "dark",
 *     "language": "en"
 *   },
 *   "created_at": "2023-05-15T10:30:00Z",
 *   "updated_at": "2023-05-16T08:45:00Z",
 *   "metadata": {
 *     "source": "user_settings",
 *     "ttl": 86400
 *   }
 * }
 * ```
 */
export interface MemoryValueResponse {
  /** The unique key identifier */
  key: string;
  /** The stored value */
  value: MemoryValue;
  /** ISO 8601 timestamp of when the key was first created */
  created_at: string;
  /** ISO 8601 timestamp of when the key was last updated */
  updated_at?: string;
  /** Optional metadata associated with the value */
  metadata?: Record<string, unknown>;
}

/**
 * Request body for PUT /memory/:key endpoint
 *
 * Used to update an existing memory value.
 *
 * @example
 * ```json
 * {
 *   "value": {
 *     "theme": "light",
 *     "language": "en"
 *   }
 * }
 * ```
 */
export interface MemoryUpdateRequest {
  /** The new value to store under the existing key */
  value: MemoryValue;
}

/**
 * Response for PUT /memory/:key endpoint
 *
 * Confirms that a memory value was updated and returns the previous value.
 *
 * @example
 * ```json
 * {
 *   "status": "updated",
 *   "previous_value": {
 *     "theme": "dark",
 *     "language": "en"
 *   },
 *   "metadata": {
 *     "source": "user_settings",
 *     "ttl": 86400
 *   }
 * }
 * ```
 */
export interface MemoryUpdateResponse {
  /** Indicates the update operation completed successfully */
  status: "updated";
  /** The previous value that was replaced */
  previous_value: MemoryValue;
  /** Optional metadata associated with the value */
  metadata?: Record<string, unknown>;
}

/**
 * URL parameters for DELETE /memory/:key endpoint
 *
 * Used when deleting a specific memory entry.
 */
export interface MemoryDeleteParams {
  /** The key of the memory entry to delete */
  key: string;
}

/**
 * Response for DELETE /memory/:key endpoint
 *
 * Confirms that a memory entry was successfully deleted.
 *
 * @example
 * ```json
 * {
 *   "status": "deleted"
 * }
 * ```
 */
export interface MemoryDeleteResponse {
  /** Indicates the delete operation completed successfully */
  status: "deleted";
}

/**
 * Request for POST /memory/query endpoint
 *
 * Used to search for memory entries using semantic or filtered search.
 *
 * @example
 * ```json
 * {
 *   "query": "What theme settings do I have?",
 *   "limit": 5,
 *   "filter": {
 *     "key_prefix": "user_"
 *   }
 * }
 * ```
 */
export interface MemoryQueryRequest {
  /** The semantic query string to search for */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Optional filters to apply to the search */
  filter?: {
    /** Only include keys that start with this prefix */
    "key_prefix"?: string;
    /** Only include keys that end with this suffix */
    "key_suffix"?: string;
    /** Only include keys that contain this substring */
    "key_contains"?: string;
    /** Exclude keys that contain this substring */
    "key_not_contains"?: string;
    /** Only include keys that match this regular expression */
    "key_matches"?: string;
  };
}

/**
 * Result entry for memory queries
 *
 * Represents a single memory entry returned from a query operation.
 */
export interface MemoryQueryResult {
  /** The key of the matched memory entry */
  key: string;
  /** The stored value */
  value: MemoryValue;
  /** A relevance score between 0.0 and 1.0, with higher values indicating better matches */
  score: number;
  /** Optional metadata associated with the value */
  metadata?: Record<string, unknown>;
  /** ISO 8601 timestamp of when the key was first created */
  created_at?: string;
  /** ISO 8601 timestamp of when the key was last updated */
  updated_at?: string;
}

/**
 * Response for POST /memory/query endpoint
 *
 * Returns memory entries that match a given query, sorted by relevance.
 *
 * @example
 * ```json
 * {
 *   "results": [
 *     {
 *       "key": "user_preference",
 *       "value": {
 *         "theme": "dark",
 *         "language": "en"
 *       },
 *       "score": 0.92
 *     }
 *   ]
 * }
 * ```
 */
export interface MemoryQueryResponse {
  /** Array of matching memory entries, sorted by relevance */
  results: MemoryQueryResult[];
}

//#endregion

//#region RESOURCES

/**
 * Standard resource types in SLOP
 *
 * Common types include "article", "document", "image", "code", "file", etc.
 * Custom types can also be defined as string literals.
 */
export type ResourceType =
  | "article"
  | "document"
  | "image"
  | "code"
  | "file"
  | "data"
  | "audio"
  | "video"
  | "table"
  | "graph"
  | "web"
  | "text"
  | string;

/**
 * Core resource definition in the SLOP pattern
 *
 * Resources are content or knowledge items that can be accessed by AI assistants
 * to provide information to users. A resource could be an article, document,
 * image, code snippet, or other data.
 */
export interface Resource {
  /** Unique identifier for the resource */
  id: string;
  /** The actual content of the resource */
  content: string;
  /**
   * The type or format of the resource
   * Common types include "article", "document", "image", "code", "file"
   */
  type: ResourceType;
}

/**
 * Metadata for a resource
 *
 * Provides additional information about a resource, such as its origin
 * and last update time.
 */
export interface ResourceMetadata {
  /** Origin or provider of the resource (e.g., "knowledge-base", "web-scrape", "user-upload") */
  source: string;
  /** ISO 8601 timestamp of when the resource was last updated */
  last_updated: string;
}

/**
 * Extended resource schema for API responses
 *
 * Adds optional fields to the base Resource for use in API responses.
 */
export interface ResourceSchema extends Resource {
  /** Optional filename for file-type resources */
  name?: string;
  /** Optional human-readable title for the resource */
  title?: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional description summary */
  description?: string;
  /** Optional format specific to the resource type */
  format?: string;
  /** Optional language code (e.g., "en", "fr") */
  language?: string;
  /** Optional size in bytes for files */
  size?: number;
}

/**
 * Response for GET /resources endpoint
 *
 * Returns a list of available resources with their basic information.
 *
 * @example
 * ```json
 * {
 *   "resources": [
 *     {
 *       "id": "mars-101",
 *       "title": "Mars: The Red Planet",
 *       "type": "article"
 *     },
 *     {
 *       "id": "document-123",
 *       "name": "project_plan.pdf",
 *       "type": "file"
 *     }
 *   ]
 * }
 * ```
 */
export interface ResourceListResponse {
  /** Array of available resources */
  resources: ResourceSchema[];
}

/**
 * URL parameters for GET /resources/:id endpoint
 *
 * Used when retrieving a specific resource by its ID.
 */
export interface ResourceGetParams {
  /** The unique identifier of the resource to retrieve */
  resource_id: string;
}

/**
 * Response for GET /resources/:id endpoint
 *
 * Returns a complete resource including its content and metadata.
 *
 * @example
 * ```json
 * {
 *   "id": "mars-101",
 *   "title": "Mars: The Red Planet",
 *   "type": "article",
 *   "content": "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System...",
 *   "metadata": {
 *     "source": "astronomy-db",
 *     "last_updated": "2023-05-10"
 *   },
 *   "tags": ["astronomy", "planets", "solar-system"],
 *   "last_accessed": "2023-06-10T15:30:00Z",
 *   "access_count": 42
 * }
 * ```
 */
export interface ResourceResponse extends ResourceSchema {
  /** Additional metadata about the resource */
  metadata: ResourceMetadata;
  /** When the resource was last accessed */
  last_accessed?: string;
  /** Number of times the resource has been accessed */
  access_count?: number;
}

/**
 * Query parameters for GET /resources/search endpoint
 *
 * Used to search for resources by content or metadata.
 */
export interface ResourceSearchParams {
  /** The search query string */
  q: string;
}

/**
 * Response for GET /resources/search endpoint
 *
 * Returns resources that match the search query, sorted by relevance.
 *
 * @example
 * ```json
 * {
 *   "results": [
 *     {
 *       "id": "mars-101",
 *       "title": "Mars: The Red Planet",
 *       "type": "article",
 *       "score": 0.98
 *     },
 *     {
 *       "id": "solar-system",
 *       "title": "Our Solar System",
 *       "type": "article",
 *       "score": 0.75
 *     }
 *   ]
 * }
 * ```
 */
export interface ResourceSearchResponse {
  /**
   * Array of matching resources with relevance scores
   * Higher scores indicate better matches to the search query
   */
  results: Array<
    ResourceSchema & {
      /** Relevance score between 0.0 and 1.0 */
      score: number;
    }
  >;
}

//#endregion

//#region PAY

/**
 * A unique identifier for a payment transaction
 *
 * In SLOP, transaction IDs follow a standardized format with the 'tx_' prefix
 * followed by a unique string (typically a UUID or similar).
 *
 * @example 'tx_123456789abcdef'
 */
export type TransactionId = `tx_${string}`;

/**
 * URL parameters for GET /pay/:id endpoint
 *
 * Used when retrieving information about a specific payment transaction.
 */
export interface PaymentGetParams {
  /** The unique identifier of the transaction to retrieve */
  id: TransactionId;
}

/**
 * Request for POST /pay endpoint
 *
 * Used to create a new payment transaction.
 *
 * @example
 * ```json
 * {
 *   "amount": 5.00,
 *   "currency": "USD",
 *   "description": "API usage - 1000 tokens",
 *   "payment_method": "card_token_123"
 * }
 * ```
 */
export interface PayPostRequest {
  /** The payment amount as a number */
  amount: number;
  /** Three-letter currency code (e.g., "USD", "EUR", "JPY") */
  currency: string;
  /** Human-readable description of what this payment is for */
  description: string;
  /**
   * Identifier for the payment method to use
   * This could be a stored card token, wallet ID, or other payment identifier
   */
  payment_method: string;
}

/**
 * Response for POST /pay endpoint
 *
 * Confirms that a payment transaction was successfully processed.
 *
 * @example
 * ```json
 * {
 *   "transaction_id": "tx_987654",
 *   "status": "success",
 *   "receipt_url": "https://api.example.com/receipts/tx_987654"
 * }
 * ```
 */
export interface PayPostResponse {
  /** Unique identifier for the created transaction */
  transaction_id: TransactionId;
  /**
   * Status of the transaction
   * While currently only "success" is supported, future versions may support
   * additional statuses like "pending" or "failed"
   */
  status: "success";
  /** URL where a receipt or transaction details can be viewed */
  receipt_url: string;
}

/**
 * Response for GET /pay/:id endpoint
 *
 * Returns detailed information about a specific payment transaction.
 *
 * @example
 * ```json
 * {
 *   "transaction_id": "tx_987654",
 *   "amount": 5.00,
 *   "currency": "USD",
 *   "description": "API usage - 1000 tokens",
 *   "status": "success",
 *   "created_at": "2023-05-15T10:30:00Z",
 *   "receipt_url": "https://api.example.com/receipts/tx_987654",
 *   "payment_method": "card_token_123"
 * }
 * ```
 */
export interface PayGetByIdResponse {
  /** Unique identifier for this transaction */
  transaction_id: TransactionId;
  /** The payment amount */
  amount: number;
  /** Three-letter currency code */
  currency: string;
  /** Human-readable description of what this payment was for */
  description: string;
  /** Current status of the transaction */
  status: "success";
  /** ISO 8601 timestamp of when the transaction was created */
  created_at: string;
  /** URL where a receipt or transaction details can be viewed */
  receipt_url: string;
  /** Identifier for the payment method used */
  payment_method: string;
}

//#endregion

//#region SCOPE

/**
 * Top-level scope categories in the SLOP permission system
 *
 * These prefixes represent the major API endpoints and functionality groups
 * that can be controlled via scope permissions.
 */
export type ScopePrefix =
  /** Chat-related permissions */
  | "chat"
  /** Tool-related permissions */
  | "tools"
  /** Memory storage permissions */
  | "memory"
  /** Resource access permissions */
  | "resources"
  /** Payment permissions */
  | "pay";

/**
 * Chat-related scope permissions
 *
 * Controls access to chat history, creation of new chats, and management
 * of chat threads.
 *
 * @examples
 * - "chat.read" - Read access to all chats
 * - "chat.thread_123.read" - Read access to a specific thread
 * - "chat.write" - Permission to create new chats
 * - "chat.*" - Full access to all chat functionality
 */
export type ScopeChatAction =
  /** General read/write permissions for all chats */
  | `chat.${"read" | "write"}`
  /** Permissions for specific chat IDs or thread IDs */
  | `chat.${string}.${"read" | "write"}`
  /** Wildcard for full chat permissions */
  | `chat.*`;

/**
 * Tool-related scope permissions
 *
 * Controls which tools can be executed and viewed. Particularly important
 * for security as tools can perform actions with side effects.
 *
 * @examples
 * - "tools.calculator.execute" - Permission to use the calculator tool
 * - "tools.safe.weather" - Permission to use a tool designated as "safe"
 * - "tools.read" - Permission to list available tools
 * - "tools.*" - Full access to all tools
 */
export type ScopeToolAction =
  /** Permission to execute a specific tool */
  | `tools.${string}.execute`
  /** Permission to use a tool in the "safe" category */
  | `tools.safe.${string}`
  /** Permission to view information about a specific tool */
  | `tools.${string}.read`
  /** Permission to list all available tools */
  | `tools.read`
  /** Wildcard for full tool permissions */
  | `tools.*`;

/**
 * Memory-related scope permissions
 *
 * Controls access to the key-value storage system, allowing
 * fine-grained control over which keys can be read or modified.
 *
 * @examples
 * - "memory.user_preference.read" - Read access to a specific key
 * - "memory.user_preference.write" - Write access to a specific key
 * - "memory..read" - Read-only access to all memory entries
 * - "memory.*" - Full access to all memory operations
 */
export type ScopeMemoryAction =
  /** Read or write access to a specific memory key */
  | `memory.${string}.${"read" | "write"}`
  /** Read-only access to all memory keys */
  | `memory..read`
  /** Wildcard for full memory permissions */
  | `memory.*`;

/**
 * Resource-related scope permissions
 *
 * Controls access to knowledge resources, articles, files, and
 * search functionality.
 *
 * @examples
 * - "resources.mars-101.read" - Read access to a specific resource
 * - "resources.list.read" - Permission to list available resources
 * - "resources.search.read" - Permission to search resources
 * - "resources.*" - Full access to all resources
 */
export type ScopeResourceAction =
  /** Read access to a specific resource */
  | `resources.${string}.read`
  /** Permission to list resources */
  | `resources.list.${string}`
  /** Permission to search resources */
  | `resources.search.${string}`
  /** Wildcard for full resource permissions */
  | `resources.*`;

/**
 * Payment-related scope permissions
 *
 * Controls ability to create payments and view transaction history.
 * Critical for security to prevent unauthorized charges.
 *
 * @examples
 * - "pay.execute" - Permission to create new payments
 * - "pay.tx_123.read" - Permission to view a specific transaction
 * - "pay.*" - Full access to all payment functionality
 */
export type ScopePayAction =
  /** Permission to create new payments */
  | `pay.execute`
  /** Permission to view a specific transaction */
  | `pay.${string}.read`
  /** Wildcard for full payment permissions */
  | `pay.*`;

/**
 * Complete scope permission pattern
 *
 * The union of all possible scope patterns that can be used in the
 * X-SLOP-SCOPE header to control API access permissions.
 *
 * Scope strings should be passed in a comma-separated list, e.g.:
 * "chat.read,tools.calculator.execute,memory.user_preference.read"
 */
export type ScopePattern =
  | ScopeChatAction
  | ScopeToolAction
  | ScopeMemoryAction
  | ScopeResourceAction
  | ScopePayAction;

//#endregion

/**
 * WebSocket chat response message format
 *
 * Response sent from server to client over an established WebSocket connection.
 * During streaming, multiple messages will be sent, one for each token,
 * followed by a final message with status: "complete".
 *
 * @example
 * ```json
 * // Token message
 * {"content": "The "}
 *
 * // Completion message
 * {"status": "complete"}
 *
 * // Error message
 * {"error": "Model not available"}
 * ```
 */
export interface WebSocketChatResponse {
  /** Content of the message token */
  content?: string;
  /** Unique chat ID (typically included only in first or final message) */
  id?: ChatId;
  /** Thread ID if this message is part of a thread */
  thread_id?: ThreadId;
  /**
   * Completion status
   * When included with value "complete", indicates the end of the response stream
   */
  status?: "complete";
  /**
   * Error message if something went wrong
   * Only present in error responses
   */
  error?: string;
}
