import type {
  Resource,
  ResourceListResponse,
  ResourceMetadata,
  ResourceResponse,
  ResourceSchema,
  ResourceSearchResponse,
  ResourceType,
} from "../slop.ts";
import { SimpleSearch } from "./plugins/simpleSearch.ts";

/**
 * Enhanced resource with metadata
 */
interface EnhancedResource extends Resource {
  /** Resource metadata */
  metadata: ResourceMetadata;
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Last access timestamp */
  last_accessed?: string;
  /** Access count */
  access_count?: number;
}

/**
 * Search options for resources
 */
interface ResourceSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Filter by resource type */
  type?: ResourceType;
  /** Filter by source */
  source?: string;
  /** Filter by tags (must match all) */
  tags?: string[];
  /** Include full content in results */
  include_content?: boolean;
}

/**
 * Manages resources with enhanced search and metadata
 *
 * The ResourceManager provides functionality for:
 * - Registering and retrieving resources
 * - Advanced semantic search of resource content
 * - Categorization and filtering by type, tags, and metadata
 * - Access tracking and analytics
 */
export class ResourceManager {
  /** Store of all resources with enhanced metadata */
  #resources: Map<string, EnhancedResource>;
  /** Type index for efficient filtering */
  #typeIndex: Map<ResourceType, Set<string>>;
  /** Tag index for efficient filtering */
  #tagsIndex: Map<string, Set<string>>;
  /** Source index for efficient filtering */
  #sourceIndex: Map<string, Set<string>>;

  /**
   * Create a new resource manager
   */
  constructor() {
    this.#resources = new Map();
    this.#typeIndex = new Map();
    this.#tagsIndex = new Map();
    this.#sourceIndex = new Map();
  }

  /**
   * Register a new resource
   *
   * @param resource The resource to register
   * @param metadata Metadata for the resource
   * @param tags Optional tags for categorization
   */
  registerResource(
    resource: Resource,
    metadata: ResourceMetadata = {
      source: "unknown",
      last_updated: new Date().toISOString(),
    },
    tags: string[] = [],
  ): void {
    // Create enhanced resource
    const enhancedResource: EnhancedResource = {
      ...resource,
      metadata,
      tags,
      access_count: 0,
    };

    // Store the resource
    this.#resources.set(resource.id, enhancedResource);

    // Update indexes
    this.#indexResource(resource.id, enhancedResource);
  }

  /**
   * Update the type index
   * @private
   */
  #updateTypeIndex(id: string, type: ResourceType): void {
    if (!this.#typeIndex.has(type)) {
      this.#typeIndex.set(type, new Set());
    }
    const typeSet = this.#typeIndex.get(type);
    if (typeSet) {
      typeSet.add(id);
    }
  }

  /**
   * Update the tags index
   * @private
   */
  #updateTagsIndex(id: string, tags: string[] = []): void {
    for (const tag of tags) {
      if (!this.#tagsIndex.has(tag)) {
        this.#tagsIndex.set(tag, new Set());
      }
      const tagSet = this.#tagsIndex.get(tag);
      if (tagSet) {
        tagSet.add(id);
      }
    }
  }

  /**
   * Update the source index
   * @private
   */
  #updateSourceIndex(id: string, source: string): void {
    if (!this.#sourceIndex.has(source)) {
      this.#sourceIndex.set(source, new Set());
    }
    const sourceSet = this.#sourceIndex.get(source);
    if (sourceSet) {
      sourceSet.add(id);
    }
  }

  /**
   * Index a resource by type, tags, and source
   * @private
   */
  #indexResource(id: string, resource: EnhancedResource): void {
    // Update type index
    this.#updateTypeIndex(id, resource.type);

    // Update tags index if tags exist
    if (resource.tags && resource.tags.length > 0) {
      this.#updateTagsIndex(id, resource.tags);
    }

    // Update source index
    this.#updateSourceIndex(id, resource.metadata.source);
  }

  /**
   * Get a resource by ID
   *
   * @param id Resource ID to retrieve
   * @returns The resource or null if not found
   */
  getResource(id: string): ResourceResponse | null {
    const resource = this.#resources.get(id);
    if (!resource) return null;

    // Update access metrics
    resource.access_count = (resource.access_count || 0) + 1;
    resource.last_accessed = new Date().toISOString();

    // Ensure resource has proper metadata
    if (!resource.metadata) {
      // Add default metadata if missing
      return {
        ...resource,
        metadata: {
          source: "unknown",
          last_updated: new Date(0).toISOString(),
        },
      };
    }

    return resource as ResourceResponse;
  }

  /**
   * List all resources with optional filtering
   *
   * @param type Filter by resource type
   * @param source Filter by source
   * @param tags Filter by tags (must match all)
   * @returns Filtered list of resources
   */
  listResources(
    type?: ResourceType,
    source?: string,
    tags?: string[],
  ): ResourceListResponse {
    // Start with all resource IDs
    let resourceIds = new Set(this.#resources.keys());

    // Apply type filter if specified
    if (type && this.#typeIndex.has(type)) {
      const typeIds = this.#typeIndex.get(type);
      if (typeIds) {
        resourceIds = new Set(
          [...resourceIds].filter((id) => typeIds.has(id)),
        );
      }
    }

    // Apply source filter if specified
    if (source && this.#sourceIndex.has(source)) {
      const sourceIds = this.#sourceIndex.get(source);
      if (sourceIds) {
        resourceIds = new Set(
          [...resourceIds].filter((id) => sourceIds.has(id)),
        );
      }
    }

    // Apply tag filters if specified (all tags must match)
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (this.#tagsIndex.has(tag)) {
          const tagIds = this.#tagsIndex.get(tag);
          if (tagIds) {
            resourceIds = new Set(
              [...resourceIds].filter((id) => tagIds.has(id)),
            );
          }
        } else {
          // If any tag doesn't exist, return empty result
          resourceIds = new Set();
          break;
        }
      }
    }

    // Map to resource schemas
    const resources = [...resourceIds]
      .map((id) => this.#resources.get(id))
      .filter((res): res is EnhancedResource => res !== undefined) // Type guard to filter out undefined
      .map((res) => ({
        id: res.id,
        content: res.content,
        type: res.type,
        name: "name" in res ? res.name as string : undefined,
        title: "title" in res ? res.title as string : undefined,
        tags: res.tags,
        metadata: res.metadata,
      }));

    return { resources };
  }

  /**
   * Search for resources matching a query
   *
   * @param query The search query
   * @param options Search options
   * @returns Search results with relevance scores
   */
  search(
    query: string,
    options: ResourceSearchOptions = {},
  ): ResourceSearchResponse {
    // Get candidate resources (apply filters first)
    let candidateResources = Array.from(this.#resources.values());

    // Filter by type if specified
    if (options.type) {
      candidateResources = candidateResources.filter(
        (resource) => resource.type === options.type,
      );
    }

    // Filter by source if specified
    if (options.source) {
      candidateResources = candidateResources.filter(
        (resource) => resource.metadata.source === options.source,
      );
    }

    // Filter by tags if specified (all tags must match)
    if (options.tags && options.tags.length > 0) {
      candidateResources = candidateResources.filter((resource) => {
        if (!resource.tags || resource.tags.length === 0) return false;
        return options.tags!.every((tag) => resource.tags!.includes(tag));
      });
    }

    // Score resources using SimpleSearch
    const results: Array<ResourceSchema & { score: number }> = [];

    for (const resource of candidateResources) {
      // Build searchable content with proper type guards
      const titleStr = "title" in resource &&
          resource.title !== undefined &&
          typeof resource.title === "string"
        ? resource.title
        : "";

      const nameStr = "name" in resource &&
          resource.name !== undefined &&
          typeof resource.name === "string"
        ? resource.name
        : "";

      const descStr = "description" in resource &&
          resource.description !== undefined &&
          typeof resource.description === "string"
        ? resource.description
        : "";

      const searchableContent = [
        resource.id,
        typeof resource.content === "string" ? resource.content : "",
        titleStr,
        nameStr,
        descStr,
        resource.tags ? resource.tags.join(" ") : "",
      ].join(" ");

      // Get relevance score
      const score = SimpleSearch.scoreRelevance(query, searchableContent);

      // Add to results if score is significant
      if (score > 0.1) {
        const result: ResourceSchema & { score: number } = {
          id: resource.id,
          type: resource.type,
          content: options.include_content ? resource.content : "",
          score,
        };

        // Add optional fields if present with proper type checking
        if (
          "title" in resource &&
          typeof resource.title === "string"
        ) {
          result.title = resource.title;
        }

        if (
          "name" in resource &&
          typeof resource.name === "string"
        ) {
          result.name = resource.name;
        }

        if (
          "description" in resource &&
          typeof resource.description === "string"
        ) {
          result.description = resource.description;
        }

        if (resource.tags) {
          result.tags = resource.tags;
        }

        results.push(result);
      }
    }

    // Sort by score and apply limit
    results.sort((a, b) => b.score - a.score);

    const limit = options.limit || 10; // Default limit to 10 results
    return {
      results: results.slice(0, limit),
    };
  }

  /**
   * Update resource tags
   *
   * @param id Resource ID to update
   * @param tags New tags to assign
   * @returns True if resource was updated, false if not found
   */
  updateTags(id: string, tags: string[]): boolean {
    const resource = this.#resources.get(id);
    if (!resource) return false;

    // Remove from existing tag indexes
    if (resource.tags) {
      for (const tag of resource.tags) {
        const tagSet = this.#tagsIndex.get(tag);
        if (tagSet) {
          tagSet.delete(id);
          // Clean up empty sets
          if (tagSet.size === 0) {
            this.#tagsIndex.delete(tag);
          }
        }
      }
    }

    // Update resource tags
    resource.tags = [...tags];

    // Add to new tag indexes
    this.#updateTagsIndex(id, tags);

    return true;
  }

  /**
   * Update resource metadata
   *
   * @param id Resource ID to update
   * @param metadata New metadata
   * @returns True if resource was updated, false if not found
   */
  updateMetadata(id: string, metadata: Partial<ResourceMetadata>): boolean {
    const resource = this.#resources.get(id);
    if (!resource) return false;

    // Handle source change
    if (metadata.source && metadata.source !== resource.metadata.source) {
      // Remove from old source index
      const oldSourceSet = this.#sourceIndex.get(resource.metadata.source);
      if (oldSourceSet) {
        oldSourceSet.delete(id);
        // Clean up empty sets
        if (oldSourceSet.size === 0) {
          this.#sourceIndex.delete(resource.metadata.source);
        }
      }

      // Update source index
      this.#updateSourceIndex(id, metadata.source);
    }

    // Update metadata
    resource.metadata = {
      ...resource.metadata,
      ...metadata,
    };

    return true;
  }

  /**
   * Delete a resource
   *
   * @param id Resource ID to delete
   * @returns True if resource was deleted, false if not found
   */
  deleteResource(id: string): boolean {
    const resource = this.#resources.get(id);
    if (!resource) return false;

    // Remove from type index
    const typeSet = this.#typeIndex.get(resource.type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) {
        this.#typeIndex.delete(resource.type);
      }
    }

    // Remove from tag indexes
    if (resource.tags) {
      for (const tag of resource.tags) {
        const tagSet = this.#tagsIndex.get(tag);
        if (tagSet) {
          tagSet.delete(id);
          if (tagSet.size === 0) {
            this.#tagsIndex.delete(tag);
          }
        }
      }
    }

    // Remove from source index
    const sourceSet = this.#sourceIndex.get(resource.metadata.source);
    if (sourceSet) {
      sourceSet.delete(id);
      if (sourceSet.size === 0) {
        this.#sourceIndex.delete(resource.metadata.source);
      }
    }

    // Remove resource
    this.#resources.delete(id);

    return true;
  }

  /**
   * Count resources by type
   *
   * @returns Map of resource types to counts
   */
  countByType(): Map<ResourceType, number> {
    const counts = new Map<ResourceType, number>();

    for (const [type, ids] of this.#typeIndex.entries()) {
      counts.set(type, ids.size);
    }

    return counts;
  }

  /**
   * Get all available tags with counts
   *
   * @returns Map of tags to counts
   */
  getTags(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const [tag, ids] of this.#tagsIndex.entries()) {
      counts.set(tag, ids.size);
    }

    return counts;
  }

  /**
   * Get resource access statistics
   *
   * @returns Statistics about resource access
   */
  getAccessStats(): {
    mostAccessed: { id: string; count: number }[];
    recentlyAccessed: { id: string; lastAccessed: string }[];
    totalAccesses: number;
  } {
    const mostAccessed = Array.from(this.#resources.entries())
      .map(([id, resource]) => ({
        id,
        count: resource.access_count || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentlyAccessed = Array.from(this.#resources.entries())
      .filter(([_, resource]) => resource.last_accessed)
      .map(([id, resource]) => ({
        id,
        lastAccessed: resource.last_accessed!,
      }))
      .sort((a, b) => b.lastAccessed.localeCompare(a.lastAccessed))
      .slice(0, 10);

    const totalAccesses = Array.from(this.#resources.values())
      .reduce((sum, resource) => sum + (resource.access_count || 0), 0);

    return {
      mostAccessed,
      recentlyAccessed,
      totalAccesses,
    };
  }
}
