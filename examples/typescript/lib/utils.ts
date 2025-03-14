import type { ChatId, MessageId, ThreadId, TransactionId } from "../slop.ts";

/**
 * Helper for generating unique IDs with type safety
 * @param prefix The prefix to use for the ID (e.g., "chat", "msg", "tx")
 * @returns A unique ID with the given prefix
 */
function generateId<T extends string>(prefix: T): `${T}_${string}` {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${uuid}` as `${T}_${string}`;
}

/**
 * Generate a chat ID with proper type safety
 * @returns A unique chat ID with "chat_" prefix
 */
export function generateChatId(): ChatId {
  return generateId("chat");
}

/**
 * Generate a thread ID with proper type safety
 * @returns A unique thread ID with "thread_" prefix
 */
export function generateThreadId(): ThreadId {
  return generateId("thread");
}

/**
 * Generate a message ID with proper type safety
 * @returns A unique message ID with "msg_" prefix
 */
export function generateMessageId(): MessageId {
  return generateId("msg");
}

/**
 * Generate a transaction ID with proper type safety
 * @returns A unique transaction ID with "tx_" prefix
 */
export function generateTransactionId(): TransactionId {
  return generateId("tx");
}

/**
 * Extract path parameters from a URL path based on a pattern
 * Converts route patterns like "/chat/:id" to extractable parameters
 * from actual paths like "/chat/123" resulting in { id: "123" }
 *
 * @param path The actual URL path to extract parameters from
 * @param pattern The pattern to match against with parameter placeholders (e.g., "/chat/:id", "/tools/:tool_id")
 * @returns Record<string, string> Object with parameter names as keys and their values
 *
 * @example
 * // Returns { id: "123" }
 * extractPathParams("/chat/123", "/chat/:id")
 *
 * @example
 * // Returns { tool_id: "calculator" }
 * extractPathParams("/tools/calculator", "/tools/:tool_id")
 *
 * @example
 * // Returns {} (empty object) when no match
 * extractPathParams("/chat/123/messages", "/chat/:id")
 */
export function extractPathParams(
  path: string,
  pattern: string,
): Record<string, string> {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return {};
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart !== undefined && patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      if (pathPart !== undefined) {
        params[paramName] = pathPart;
      }
    } else if (patternPart !== pathPart) {
      return {};
    }
  }

  return params;
}
