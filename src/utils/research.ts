import type { CollectionEntry } from 'astro:content';

export function orderResearchEntries(entries: CollectionEntry<'research'>[]) {
  const catalogueIds = entries.map((entry) => entry.data.catalogueId);
  if (new Set(catalogueIds).size !== catalogueIds.length) {
    throw new Error('Research catalogue IDs must be unique');
  }

  return [...entries].sort((a, b) => a.data.order - b.data.order);
}
