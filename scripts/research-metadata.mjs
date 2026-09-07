import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

export async function loadResearchMetadata(root) {
  const directory = join(root, 'src', 'content', 'research');
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .sort();

  const entries = await Promise.all(files.map(async (file) => {
    const source = await readFile(join(directory, file), 'utf8');
    const { data } = matter(source);

    if (
      typeof data.title !== 'string'
      || typeof data.catalogueId !== 'string'
      || typeof data.order !== 'number'
    ) {
      throw new Error(`Invalid research frontmatter in ${file}`);
    }

    return {
      id: file.replace(/\.mdx?$/, ''),
      title: data.title,
      catalogueId: data.catalogueId,
      order: data.order,
    };
  }));

  const catalogueIds = entries.map((entry) => entry.catalogueId);
  if (new Set(catalogueIds).size !== catalogueIds.length) {
    throw new Error('Research catalogue IDs must be unique');
  }

  return entries.sort((a, b) => a.order - b.order);
}
