/**
 * SimpleSearch utility
 * Provides basic keyword-based relevance scoring
 */
export class SimpleSearch {
  /**
   * Simple keyword-based relevance scoring
   * @param query The search query
   * @param text The text to score against the query
   * @returns Score between 0 and 1
   */
  public static scoreRelevance(query: string, text: string): number {
    // Normalize strings for comparison
    const normalizedQuery = query.toLowerCase();
    const normalizedText = text.toLowerCase();

    // Check for exact match
    if (normalizedText.includes(normalizedQuery)) {
      return 1.0;
    }

    // Split into keywords and count matches
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);
    if (queryWords.length === 0) return 0;

    let matchCount = 0;
    for (const word of queryWords) {
      if (normalizedText.includes(word)) {
        matchCount++;
      }
    }

    // Return simple match ratio
    return matchCount / queryWords.length;
  }
}
