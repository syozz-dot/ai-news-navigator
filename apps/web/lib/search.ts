const MAX_SEARCH_LENGTH = 80;
const MAX_SEARCH_TERMS = 6;

export function normalizeSearchQuery(value: string | null | undefined) {
  const normalized = value
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_SEARCH_LENGTH);
  return normalized || undefined;
}

export function storySearchTerms(query: string) {
  return query
    .split(" ")
    .map((term) => term.replace(/[\\%_]/g, "\\$&"))
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS);
}
