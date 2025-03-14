import type {
  MemoryDeleteResponse,
  MemoryKeyListResponse,
  MemoryQueryRequest,
  MemoryQueryResponse,
  MemoryQueryResult,
  MemoryStoreResponse,
  MemoryUpdateResponse,
  MemoryValue,
  MemoryValueResponse,
} from "../slop.ts";
import { SimpleSearch } from "./plugins/simpleSearch.ts";

/**
 * Memory entry with metadata and embeddings
 */
interface MemoryEntry {
  /** The stored value */
  value: MemoryValue;
  /** When the entry was created */
  created_at: string;
  /** Last time the entry was updated */
  updated_at?: string;
  /** Time-to-live in seconds (0 = never expires) */
  ttl?: number;
  /** Metadata associated with the entry */
  metadata?: Record<string, unknown>;
}

/**
 * Time-to-live options for memory items
 */
interface TTLOptions {
  /** Time-to-live in seconds (0 = never expires) */
  ttl?: number;
  /** Whether to refresh TTL on read operations */
  refreshOnRead?: boolean;
}

/**
 * Storage options for memory items
 */
interface MemoryStoreOptions {
  /** TTL options for the entry */
  ttl?: TTLOptions;
  /** Custom metadata to associate with the entry */
  metadata?: Record<string, unknown>;
}

/**
 * Manages memory storage, semantic search, and retrieval
 *
 * The MemoryManager provides a key-value store with:
 * - Simple semantic search capabilities
 * - Time-to-live (TTL) expiration
 * - Key filtering and pattern matching
 * - Metadata storage and retrieval
 */
export class MemoryManager {
  /** Primary key-value store */
  #memory: Map<string, MemoryEntry>;
  /** Expiration scheduler */
  #expirationTimers: Map<string, number>;
  /** Default TTL settings */
  #defaultTTL: TTLOptions;

  /**
   * Create a new memory manager
   * @param defaultTTL Default TTL settings for new entries
   */
  constructor(defaultTTL: TTLOptions = { ttl: 0, refreshOnRead: false }) {
    this.#memory = new Map();
    this.#expirationTimers = new Map();
    this.#defaultTTL = defaultTTL;

    // Start the expiration checker if default TTL is set
    if (this.#defaultTTL.ttl && this.#defaultTTL.ttl > 0) {
      // Check for expired entries every minute
      // TODO: this should be configurable & we should define constants externally
      setInterval(() => this.#checkExpiredEntries(), 60000);
    }
  }

  /**
   * Store a value in memory
   *
   * @param key Unique identifier for the value
   * @param value The value to store
   * @param options Storage options like TTL and metadata
   * @returns Storage confirmation response
   */
  store(
    key: string,
    value: MemoryValue,
    options?: MemoryStoreOptions,
  ): MemoryStoreResponse {
    const timestamp = new Date().toISOString();

    // Create the memory entry
    const entry: MemoryEntry = {
      value,
      created_at: timestamp,
      updated_at: timestamp,
      ttl: options?.ttl?.ttl ?? this.#defaultTTL.ttl,
      metadata: options?.metadata || {},
    };

    // Store the entry
    this.#memory.set(key, entry);

    // Set expiration timer if TTL is specified
    this.#setExpirationTimer(key, entry.ttl);

    return { status: "stored" };
  }

  /**
   * Get a value by key
   *
   * @param key The key to retrieve
   * @returns The value response or null if not found
   */
  getValue(key: string): MemoryValueResponse | null {
    const entry = this.#memory.get(key);
    if (!entry) return null;

    // Refresh TTL if configured to do so
    if (entry.ttl && entry.ttl > 0 && this.#defaultTTL.refreshOnRead) {
      this.#refreshTTL(key, entry.ttl);
    }

    return {
      key,
      value: entry.value,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      metadata: entry.metadata,
    };
  }

  /**
   * List all keys in memory
   *
   * @param prefix Optional prefix to filter keys
   * @returns List of keys with their creation timestamps
   */
  listKeys(prefix?: string): MemoryKeyListResponse {
    let entries = Array.from(this.#memory.entries());

    // Filter by prefix if specified
    if (prefix) {
      entries = entries.filter(([key]) => key.startsWith(prefix));
    }

    const keys = entries.map(([key, entry]) => ({
      key,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      metadata: entry.metadata,
    }));

    return { keys };
  }

  /**
   * Update an existing value
   *
   * @param key The key to update
   * @param value The new value
   * @param options Storage options like TTL and metadata
   * @returns Update confirmation with previous value or null if not found
   */
  update(
    key: string,
    value: MemoryValue,
    options?: MemoryStoreOptions,
  ): MemoryUpdateResponse | null {
    const entry = this.#memory.get(key);
    if (!entry) return null;

    const previous_value = entry.value;
    const timestamp = new Date().toISOString();

    // Update entry properties
    entry.value = value;
    entry.updated_at = timestamp;

    // Update TTL if specified
    if (options?.ttl) {
      entry.ttl = options.ttl.ttl;
      this.#setExpirationTimer(key, entry.ttl);
    }

    // Update metadata if specified
    if (options?.metadata) {
      entry.metadata = { ...entry.metadata, ...options.metadata };
    }

    // TODO: recompute anything related to semantic search here

    // Update the entry
    this.#memory.set(key, entry);

    return {
      status: "updated",
      previous_value,
      metadata: entry.metadata,
    };
  }

  /**
   * Delete a value by key
   *
   * @param key The key to delete
   * @returns Delete confirmation or null if not found
   */
  delete(key: string): MemoryDeleteResponse | null {
    const exists = this.#memory.has(key);
    if (!exists) return null;

    // Clear any expiration timer
    if (this.#expirationTimers.has(key)) {
      clearTimeout(this.#expirationTimers.get(key));
      this.#expirationTimers.delete(key);
    }

    this.#memory.delete(key);
    return { status: "deleted" };
  }

  /**
   * Advanced semantic search
   *
   * Performs a semantic search across memory values considering:
   * - Semantic similarity to the query
   * - Exact keyword matching
   * - Metadata filtering
   * - Advanced key pattern filtering
   *
   * @param query The search query
   * @param limit Maximum number of results to return
   * @param filter Key pattern filters to apply
   * @returns Search results with relevance scores
   */
  query(
    query: string,
    limit?: number,
    filter?: MemoryQueryRequest["filter"],
  ): MemoryQueryResponse {
    // Apply filters first to reduce the search space
    const filteredEntries = this.#applyKeyFilters(filter);

    // Score entries using multiple ranking signals
    const results: MemoryQueryResult[] = [];

    // Implement simple semantic search
    for (const [key, entry] of filteredEntries) {
      // Extract searchable text from the value
      const searchableText = this.#extractTextFromValue(entry.value);

      // Add the key to the searchable text to match on keys too
      const fullText = `${key} ${searchableText}`;

      // Get relevance score using SimpleSearch
      const score = SimpleSearch.scoreRelevance(query, fullText);

      // Only include results with a meaningful score (above threshold)
      if (score > 0.1) {
        results.push({
          key,
          value: entry.value,
          score,
          metadata: entry.metadata,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        });
      }
    }

    // Sort by score (highest first) and apply limit
    results.sort((a, b) => b.score - a.score);
    return {
      results: limit ? results.slice(0, limit) : results,
    };
  }

  /**
   * Apply key filters to memory entries
   *
   * @param filter Key pattern filters to apply
   * @returns Filtered entries
   * @private
   */
  #applyKeyFilters(filter?: MemoryQueryRequest["filter"]): [string, MemoryEntry][] {
    let filteredEntries = Array.from(this.#memory.entries());

    if (filter) {
      // Prefix filter
      if (filter.key_prefix) {
        filteredEntries = filteredEntries.filter(([key]) => key.startsWith(filter.key_prefix!));
      }

      // Suffix filter
      if (filter.key_suffix) {
        filteredEntries = filteredEntries.filter(([key]) => key.endsWith(filter.key_suffix!));
      }

      // Contains filter
      if (filter.key_contains) {
        filteredEntries = filteredEntries.filter(([key]) => key.includes(filter.key_contains!));
      }

      // Not contains filter
      if (filter.key_not_contains) {
        filteredEntries = filteredEntries.filter(([key]) =>
          !key.includes(filter.key_not_contains!)
        );
      }

      // Regex pattern matching
      if (filter.key_matches) {
        try {
          const regex = new RegExp(filter.key_matches);
          filteredEntries = filteredEntries.filter(([key]) => regex.test(key));
        } catch {
          // Invalid regex, ignore this filter
          console.warn(`Invalid regex pattern: ${filter.key_matches}`);
        }
      }
    }

    return filteredEntries;
  }

  /**
   * Extract searchable text from a memory value
   *
   * @param value The memory value
   * @returns Extracted text string
   * @private
   */
  #extractTextFromValue(value: MemoryValue): string {
    if (typeof value === "string") {
      return value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    } else if (value === null) {
      return "";
    } else if (Array.isArray(value)) {
      return value.map((item) => this.#extractTextFromValue(item as MemoryValue)).join(" ");
    } else if (typeof value === "object") {
      // Extract text from all object values
      return Object.values(value)
        .map((item) => this.#extractTextFromValue(item as MemoryValue))
        .join(" ");
    }
    return "";
  }

  /**
   * Set an expiration timer for a key
   *
   * @param key The key to expire
   * @param ttl Time-to-live in seconds (0 = never expires)
   * @private
   */
  #setExpirationTimer(key: string, ttl?: number): void {
    // Clear existing timer if any
    if (this.#expirationTimers.has(key)) {
      clearTimeout(this.#expirationTimers.get(key));
      this.#expirationTimers.delete(key);
    }

    // Set new timer if TTL is specified and > 0
    if (ttl && ttl > 0) {
      const timerId = setTimeout(() => {
        this.#memory.delete(key);
        this.#expirationTimers.delete(key);
      }, ttl * 1000);

      this.#expirationTimers.set(key, timerId);
    }
  }

  /**
   * Refresh the TTL for a key
   *
   * @param key The key to refresh
   * @param ttl Time-to-live in seconds
   * @private
   */
  #refreshTTL(key: string, ttl: number): void {
    if (ttl > 0) {
      this.#setExpirationTimer(key, ttl);
    }
  }

  /**
   * Check for and remove expired entries
   * @private
   */
  #checkExpiredEntries(): void {
    const now = new Date();

    for (const [key, entry] of this.#memory.entries()) {
      if (!entry.ttl || entry.ttl <= 0) continue;

      const updatedAt = entry.updated_at ? new Date(entry.updated_at) : new Date(entry.created_at);
      const expiresAt = new Date(updatedAt.getTime() + entry.ttl * 1000);

      if (now > expiresAt) {
        this.#memory.delete(key);

        if (this.#expirationTimers.has(key)) {
          clearTimeout(this.#expirationTimers.get(key));
          this.#expirationTimers.delete(key);
        }
      }
    }
  }

  /**
   * Get the total count of memory entries
   *
   * @returns Number of entries in memory
   */
  getCount(): number {
    return this.#memory.size;
  }

  /**
   * Clear all memory entries
   */
  clear(): void {
    // Clear all entries
    this.#memory.clear();

    // Clear all timers
    for (const timerId of this.#expirationTimers.values()) {
      clearTimeout(timerId);
    }
    this.#expirationTimers.clear();
  }
}

/**
 * Type guard to validate a value is a valid MemoryValue
 * @param value The value to check
 * @returns true if the value is a valid MemoryValue, false otherwise
 */
export function isValidMemoryValue(value: unknown): value is MemoryValue {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;

  // Check if it's an array of valid memory values
  if (Array.isArray(value)) {
    return value.every((item) => isValidMemoryValue(item));
  }

  // Check if it's an object with valid memory values
  if (typeof value === "object") {
    return Object.values(value).every((item) => isValidMemoryValue(item));
  }

  return false;
}
