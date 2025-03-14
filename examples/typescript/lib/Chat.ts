import type {
  ChatContentBlock,
  ChatGetByIdResponse,
  ChatId,
  ChatListParams,
  ChatListResponse,
  ChatMessage,
  ChatMessageWithMetadata,
  ChatMetadata,
  ChatPostRequest,
  ChatPostResponse,
  ChatPostThreadResponse,
  ChatStreamResponse,
  ChatThread,
  ChatThreadListResponse,
  ChatThreadResponse,
  MessageContent,
  MessageId,
  ThreadId,
} from "../slop.ts";
import { generateChatId, generateMessageId } from "./utils.ts";

/**
 * Thread pagination options
 */
interface ThreadPaginationOptions {
  /** Maximum number of messages to return */
  limit?: number;
  /** Skip the first N messages */
  offset?: number;
  /** Return messages newer than this timestamp */
  after?: string;
  /** Return messages older than this timestamp */
  before?: string;
}

/**
 * Chat pagination options
 */
interface ChatPaginationOptions {
  /** Maximum number of chats to return */
  limit?: number;
  /** Skip the first N chats */
  offset?: number;
  /** Return chats newer than this timestamp */
  after?: string;
  /** Return chats older than this timestamp */
  before?: string;
}

/**
 * Manages chat conversations, messages, and thread history
 *
 * The ChatManager provides functionality for:
 * - Creating and retrieving chat conversations
 * - Managing threaded conversations
 * - Generating streaming responses
 * - Listing and paginating through chat history
 */
export class ChatManager {
  /** Stores chat conversations indexed by ID */
  #chats: Map<ChatId, ChatGetByIdResponse>;

  /** Stores thread conversations indexed by ID */
  #threads: Map<ThreadId, ChatThreadResponse>;

  /** Indexes chat IDs by creation timestamp for efficient pagination */
  #chatTimestampIndex: Map<string, ChatId[]>;

  /** Indexes thread IDs by creation timestamp for efficient pagination */
  #threadTimestampIndex: Map<string, ThreadId[]>;

  /**
   * Creates a new chat manager
   */
  constructor() {
    this.#chats = new Map();
    this.#threads = new Map();
    this.#chatTimestampIndex = new Map();
    this.#threadTimestampIndex = new Map();
  }

  /**
   * Creates a new chat or adds to an existing thread
   *
   * @param request The chat creation request
   * @returns The response with the created message and chat/thread ID
   */
  createChat(request: ChatPostRequest): ChatPostResponse | ChatPostThreadResponse {
    const { messages, model, thread_id: threadId } = request;

    // Validate that messages array exists and isn't empty
    if (!messages || messages.length === 0) {
      throw new SyntaxError("Messages array is required and cannot be empty");
    }

    const timestamp = new Date().toISOString();
    const dateKey = timestamp.split("T")[0]; // Get date part of timestamp for indexing (YYYY-MM-DD)

    // If thread_id is provided, add to that thread
    if (threadId) {
      return this.#addToThread(threadId, messages, model, timestamp, dateKey);
    }

    // Create a new chat
    return this.#createNewChat(messages, model, timestamp, dateKey);
  }

  /**
   * Adds messages to an existing thread or creates a new thread
   *
   * @param threadId The ID of the thread
   * @param messages The messages to add to the thread
   * @param model The model to use for the response
   * @param timestamp The current timestamp
   * @param dateKey The date key for indexing
   * @returns The response with the created message and thread ID
   * @private
   */
  #addToThread(
    threadId: ThreadId,
    messages: ChatMessage[],
    model?: string,
    timestamp = new Date().toISOString(),
    dateKey = timestamp.split("T")[0]!,
  ): ChatPostThreadResponse {
    // Get or create thread
    let thread = this.#threads.get(threadId);

    if (!thread) {
      thread = {
        thread_id: threadId,
        title: this.#generateTitleFromMessages(messages),
        messages: [],
        model: model || "default-model",
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Add to timestamp index for new threads
      const threadsForDate = this.#threadTimestampIndex.get(dateKey) || [];
      threadsForDate.push(threadId);
      this.#threadTimestampIndex.set(dateKey, threadsForDate);
    }

    // Add messages with metadata
    const messagesWithMetadata: ChatMessageWithMetadata[] = messages.map(
      (msg) => this.#appendMetadataToMessage(msg, timestamp),
    );

    // Create an assistant response
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: this.#generateAssistantResponse(messages[0]?.content || ""),
    };

    // Add assistant message with metadata
    const assistantMessageWithMetadata = this.#appendMetadataToMessage(
      assistantMessage,
      timestamp,
    );

    // Update thread
    thread.messages = [
      ...thread.messages,
      ...messagesWithMetadata,
      assistantMessageWithMetadata,
    ];
    thread.updated_at = timestamp;
    thread.model = model || thread.model;

    this.#threads.set(threadId, thread);

    return {
      thread_id: threadId,
      message: assistantMessage,
    };
  }

  /**
   * Creates a new chat conversation
   *
   * @param messages The initial messages in the conversation
   * @param model The model to use for the response
   * @param timestamp The current timestamp
   * @param dateKey The date key for indexing
   * @returns The response with the created message and chat ID
   * @private
   */
  #createNewChat(
    messages: ChatMessage[],
    model?: string,
    timestamp = new Date().toISOString(),
    dateKey = timestamp.split("T")[0],
  ): ChatPostResponse {
    const chatId = generateChatId() as ChatId;

    // Add messages with metadata
    const messagesWithMetadata: ChatMessageWithMetadata[] = messages.map(
      (msg) => this.#appendMetadataToMessage(msg, timestamp),
    );

    // Create an assistant response
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: this.#generateAssistantResponse(messages[0]?.content || ""),
    };

    // Add assistant message with metadata
    const assistantMessageWithMetadata = this.#appendMetadataToMessage(
      assistantMessage,
      timestamp,
    );

    const chat: ChatGetByIdResponse = {
      id: chatId,
      message: assistantMessage,
      messages: [...messagesWithMetadata, assistantMessageWithMetadata],
      created_at: timestamp,
      model: model || "default-model",
    };

    this.#chats.set(chatId, chat);

    // Add to timestamp index
    const chatsForDate = this.#chatTimestampIndex.get(dateKey || "") || [];
    chatsForDate.push(chatId);
    this.#chatTimestampIndex.set(dateKey || "", chatsForDate);

    return {
      id: chatId,
      message: assistantMessage,
    };
  }

  /**
   * TODO: LLM integration and real streaming response
   * Generate a streaming chat response
   *
   * @param request The chat creation request
   * @returns A ReadableStream of chat response tokens
   */
  createStreamingChat(
    request: ChatPostRequest,
  ): ReadableStream<ChatStreamResponse> {
    const { messages, model, thread_id: threadId } = request;

    // Validate that messages array exists and isn't empty
    if (!messages || messages.length === 0) {
      throw new SyntaxError("Messages array is required and cannot be empty");
    }

    // Generate a chat or thread ID
    const id = threadId || (generateChatId() as ChatId);

    // Extract content for response generation
    const userContent = this.#extractTextContent(messages[0]?.content || "");

    // Create a response text
    // TODO: in a real implementation, this would be from an LLM
    const responseText = `This is a streaming response to: "${userContent.substring(0, 30)}${
      userContent.length > 30 ? "..." : ""
    }"`;

    // Split into tokens for streaming
    // TODO: in a real implementation, this would be handled by the LLM
    const tokens = responseText.split(" ");

    // Create a timestamp for message creation
    const timestamp = new Date().toISOString();
    const dateKey = timestamp.split("T")[0];

    // Store in history when complete
    setTimeout(() => {
      if (threadId) {
        this.#addToThread(threadId, messages, model, timestamp, dateKey);
      } else {
        this.#createNewChat(messages, model, timestamp, dateKey);
      }
    }, 100);

    return new ReadableStream({
      start(controller) {
        // Send content tokens
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          controller.enqueue({
            content: token + (i < tokens.length - 1 ? " " : ""),
            id: threadId ? undefined : id as ChatId,
            thread_id: threadId,
          });
        }

        // Send completion token
        controller.enqueue({
          content: "",
          ...(({ status: "complete" }) as any),
          id: threadId ? undefined : id as ChatId,
          thread_id: threadId,
        });

        // Close the stream
        controller.close();
      },
    });
  }

  /**
   * Extracts plain text content from a message content object or string
   *
   * @param content The message content (string or complex object)
   * @returns The extracted text content
   * @private
   */
  #extractTextContent(content: MessageContent): string {
    if (typeof content === "string") {
      return content;
    } else if (content && typeof content === "object") {
      if ("text" in content && typeof content.text === "string") {
        return content.text;
      } else if (Array.isArray(content)) {
        // Handle content blocks array
        return (content as ChatContentBlock[])
          .map((block) => {
            if (typeof block === "string") return block;
            if (block.type === "text") return block.text;
            return "";
          })
          .filter((text) => text && text.length > 0)
          .join(" ");
      }
    }
    return "";
  }

  /**
   * TODO: LLM integration and real response
   * Generate an assistant response to a user message
   *
   * @param userContent The user's message content
   * @returns The assistant's response
   * @private
   */
  #generateAssistantResponse(userContent: MessageContent): string {
    const extractedContent = this.#extractTextContent(userContent);
    return `This is a response to: ${extractedContent.substring(0, 50)}${
      extractedContent.length > 50 ? "..." : ""
    }`;
  }

  /**
   * Add metadata to a chat message
   *
   * @param message The original message
   * @param timestamp The timestamp to use
   * @returns The message with added metadata
   * @private
   */
  #appendMetadataToMessage(
    message: ChatMessage,
    timestamp = new Date().toISOString(),
  ): ChatMessageWithMetadata {
    return {
      ...message,
      id: generateMessageId(),
      created_at: timestamp,
    };
  }

  /**
   * Get a chat by ID
   *
   * @param id The chat ID to retrieve
   * @returns The chat response or null if not found
   */
  getChat(id: ChatId): ChatGetByIdResponse | null {
    return this.#chats.get(id) || null;
  }

  /**
   * Get a thread by ID
   *
   * @param id The thread ID to retrieve
   * @param options Optional pagination options
   * @returns The thread response or null if not found
   */
  getThread(id: ThreadId, options?: ThreadPaginationOptions): ChatThreadResponse | null {
    const thread = this.#threads.get(id);
    if (!thread) return null;

    // If no pagination options, return the full thread
    if (!options) return thread;

    // TODO: pagination memoization to avoid re-fetching the same messages

    // Apply pagination to messages
    let messages = [...thread.messages];

    // Filter by timestamp if specified
    if (options.after) {
      messages = messages.filter((msg) => msg.created_at > options.after!);
    }

    if (options.before) {
      messages = messages.filter((msg) => msg.created_at < options.before!);
    }

    // Apply offset if specified
    if (options.offset && options.offset > 0) {
      messages = messages.slice(options.offset);
    }

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      messages = messages.slice(0, options.limit);
    }

    // Return thread with filtered messages
    return {
      ...thread,
      messages,
    };
  }

  /**
   * List available chats with pagination
   *
   * @param options Optional pagination parameters
   * @returns Paginated list of chats
   */
  listChats(params?: ChatListParams, options?: ChatPaginationOptions): ChatListResponse {
    // If type=threads is specified, return threads instead
    if (params?.type === "threads") {
      return this.listThreads(options) as unknown as ChatListResponse;
    }

    // TODO: pagination memoization to avoid re-fetching the same chats
    // TODO: also this is the same code as listThreads, so we should refactor

    // Get all chats
    let chats = Array.from(this.#chats.values());

    // Apply pagination options if specified
    if (options) {
      // Filter by creation date if specified
      if (options.after) {
        chats = chats.filter((chat) => chat.created_at > options.after!);
      }

      if (options.before) {
        chats = chats.filter((chat) => chat.created_at < options.before!);
      }

      // Sort by creation date (newest first)
      chats.sort((a, b) => b.created_at.localeCompare(a.created_at));

      // Apply offset if specified
      if (options.offset && options.offset > 0) {
        chats = chats.slice(options.offset);
      }

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        chats = chats.slice(0, options.limit);
      }
    } else {
      // Default sort by creation date (newest first)
      chats.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    // Convert to metadata format
    // TODO: memoization to avoid re-creating the same snippets
    const chatList: ChatMetadata[] = chats.map(
      (chat) => ({
        id: chat.id,
        snippet: this.#getSnippetFromMessages(chat.messages),
        created_at: chat.created_at,
      }),
    );

    return { chats: chatList };
  }

  /**
   * List available threads with pagination
   *
   * @param options Optional pagination parameters
   * @returns Paginated list of threads
   */
  listThreads(options?: ChatPaginationOptions): ChatThreadListResponse {
    // Get all threads
    let threads = Array.from(this.#threads.values());

    // Apply pagination options if specified
    if (options) {
      // Filter by creation date if specified
      if (options.after) {
        threads = threads.filter((thread) => thread.created_at > options.after!);
      }

      if (options.before) {
        threads = threads.filter((thread) => thread.created_at < options.before!);
      }

      // Sort by updated date (newest first)
      threads.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

      // Apply offset if specified
      if (options.offset && options.offset > 0) {
        threads = threads.slice(options.offset);
      }

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        threads = threads.slice(0, options.limit);
      }
    } else {
      // Default sort by updated date (newest first)
      threads.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }

    // Convert to thread format
    const threadList: ChatThread[] = threads.map(
      (thread) => ({
        id: thread.thread_id,
        title: thread.title,
        last_message: this.#getLastMessageContent(thread.messages),
        created_at: thread.created_at,
        updated_at: thread.updated_at,
      }),
    );

    return { threads: threadList };
  }

  /**
   * Delete a chat by ID
   *
   * @param id The chat ID to delete
   * @returns True if the chat was deleted, false if not found
   */
  deleteChat(id: ChatId): boolean {
    const chat = this.#chats.get(id);
    if (!chat) return false;

    this.#chats.delete(id);

    // Remove from timestamp index
    const dateKey = chat.created_at.split("T")[0]!;
    const chatsForDate = this.#chatTimestampIndex.get(dateKey) || [];
    const updatedChats = chatsForDate.filter((chatId) => chatId !== id);

    if (updatedChats.length > 0) {
      this.#chatTimestampIndex.set(dateKey, updatedChats);
    } else {
      this.#chatTimestampIndex.delete(dateKey);
    }

    return true;
  }

  /**
   * Delete a thread by ID
   *
   * @param id The thread ID to delete
   * @returns True if the thread was deleted, false if not found
   */
  deleteThread(id: ThreadId): boolean {
    const thread = this.#threads.get(id);
    if (!thread) return false;

    this.#threads.delete(id);

    // Remove from timestamp index
    const dateKey = thread.created_at.split("T")[0]!;
    const threadsForDate = this.#threadTimestampIndex.get(dateKey) || [];
    const updatedThreads = threadsForDate.filter((threadId) => threadId !== id);

    if (updatedThreads.length > 0) {
      this.#threadTimestampIndex.set(dateKey, updatedThreads);
    } else {
      this.#threadTimestampIndex.delete(dateKey);
    }

    return true;
  }

  /**
   * Update thread title
   *
   * @param id The thread ID to update
   * @param title The new title for the thread
   * @returns The updated thread or null if not found
   */
  updateThreadTitle(id: ThreadId, title: string): ChatThreadResponse | null {
    const thread = this.#threads.get(id);
    if (!thread) return null;

    thread.title = title;
    thread.updated_at = new Date().toISOString();

    this.#threads.set(id, thread);
    return thread;
  }

  /**
   * Add a system message to a thread
   *
   * @param id The thread ID to update
   * @param content The system message content
   * @returns The updated thread or null if not found
   */
  addSystemMessage(id: ThreadId, content: MessageContent): ChatThreadResponse | null {
    const thread = this.#threads.get(id);
    if (!thread) return null;

    const timestamp = new Date().toISOString();

    const systemMessage: ChatMessageWithMetadata = {
      role: "system",
      content,
      id: generateMessageId(),
      created_at: timestamp,
    };

    thread.messages.push(systemMessage);
    thread.updated_at = timestamp;

    this.#threads.set(id, thread);
    return thread;
  }

  /**
   * Get message by ID from any chat or thread
   *
   * @param messageId The message ID to find
   * @returns The message and its source (chat or thread) or null if not found
   */
  getMessage(messageId: MessageId): {
    message: ChatMessageWithMetadata;
    source: { type: "chat" | "thread"; id: ChatId | ThreadId };
  } | null {
    // Search in chats
    for (const [chatId, chat] of this.#chats.entries()) {
      const message = chat.messages.find((msg) => msg.id === messageId);
      if (message) {
        return {
          message,
          source: { type: "chat", id: chatId },
        };
      }
    }

    // Search in threads
    for (const [threadId, thread] of this.#threads.entries()) {
      const message = thread.messages.find((msg) => msg.id === messageId);
      if (message) {
        return {
          message,
          source: { type: "thread", id: threadId },
        };
      }
    }

    return null;
  }

  /**
   * Generate a title from the first user message
   * @private
   */
  #generateTitleFromMessages(messages: ChatMessage[]): string {
    const userMessage = messages.find((msg) => msg.role === "user");
    if (userMessage) {
      return this.#getSnippetFromContent(userMessage.content, 30);
    }
    return "Untitled Thread";
  }

  /**
   * Extract a snippet from message content
   * @private
   */
  #getSnippetFromContent(content: MessageContent, maxLength = 50): string {
    const extractedContent = this.#extractTextContent(content);
    return extractedContent.substring(0, maxLength) +
      (extractedContent.length > maxLength ? "..." : "");
  }

  /**
   * Get a snippet from the first user message in a conversation
   * @private
   */
  #getSnippetFromMessages(messages: ChatMessageWithMetadata[]): string {
    const userMessage = messages.find((msg) => msg.role === "user");
    if (userMessage) {
      return this.#getSnippetFromContent(userMessage.content);
    }
    return "";
  }

  /**
   * Extract text from the last message in a thread
   * @private
   */
  #getLastMessageContent(messages: ChatMessageWithMetadata[]): string {
    if (messages.length === 0) return "";
    const lastMessage = messages[messages.length - 1];
    return lastMessage ? this.#getSnippetFromContent(lastMessage.content) : "";
  }
}
