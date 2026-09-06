import { apiGet } from "./apiClient";

export interface SearchItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  badge?: string;
  href: string;
}

export interface SearchCategoryGroup {
  category: string;
  label: string;
  totalMatches: number;
  items: SearchItem[];
}

export interface SearchResultData {
  query: string;
  totalResults: number;
  categories: SearchCategoryGroup[];
}

/**
 * Searches across all accessible entities in the user's mosque.
 * Requires at least 2 characters.
 */
export async function searchGlobal(query: string, limit = 5): Promise<SearchResultData> {
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, totalResults: 0, categories: [] };
  }
  return apiGet<SearchResultData>("/search", { q, limit });
}
