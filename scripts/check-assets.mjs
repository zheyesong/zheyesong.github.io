/**
 * Asset manifest check.
 *
 * Runtime asset URLs live in three different kinds of file (.astro markup,
 * .ts modules loaded by three.js, and the generator in scripts/), and only the
 * ones that end up as an HTML href/src attribute are covered by
 * check-internal-links.mjs. A texture or model URL referenced from JavaScript
 * can therefore go stale without any build step noticing.
 *
 * This check resolves every `/assets/...` style reference found in source
 * against public/, and reports files in public/assets that nothing references.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, 'public');
const sourceDirs = ['src', 'scripts'];
const sourceExtensions = new Set(['.astro', '.ts', '.tsx', '.mjs', '.js', '.css', '.md', '.json']);
// This file documents the pattern it searches for, so scanning itself would
// report its own example URLs as broken references.
const selfPath = fileURLToPath(import.meta.url);

// Referenced by the platform or by external consumers rather than by our source.
const implicitlyUsed = new Set([
  'about.html',
  'blog.html',
  'blog-read.html',
  'reading.html',
  'reading-read.html',
]);

const assetPattern = /['"`(](\/(?:assets\/[^'"`)\s]+|[\w.-]+\.(?:png|jpe?g|webp|avif|svg|gif|ico|pdf|glb|gltf|woff2?)))['"`)]/gi;

async function walk(directory, filter) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path, filter);
    return entry.isFile() && filter(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const sourceFiles = (await Promise.all(sourceDirs.map((directory) => walk(
  join(root, directory),
  (name) => sourceExtensions.has(name.slice(name.lastIndexOf('.'))),
)))).flat().filter((file) => file !== selfPath);

const references = new Map();
for (const file of sourceFiles) {
  const contents = await readFile(file, 'utf8');
  for (const match of contents.matchAll(assetPattern)) {
    const url = match[1];
    if (!references.has(url)) references.set(url, []);
    references.get(url).push(relative(root, file));
  }
}

const missing = [];
for (const [url, sources] of references) {
  if (!(await isFile(join(publicDir, url.slice(1))))) {
    missing.push(`${url}  (referenced by ${sources.join(', ')})`);
  }
}

if (missing.length > 0) {
  console.error('Referenced assets are missing from public/:');
  missing.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

const referencedPaths = new Set([...references.keys()].map((url) => url.slice(1)));
const publicFiles = (await walk(publicDir, () => true))
  .map((path) => relative(publicDir, path).split(sep).join('/'));
const unreferenced = publicFiles.filter(
  (path) => !referencedPaths.has(path) && !implicitlyUsed.has(path),
);

console.log(`Asset check passed (${references.size} referenced assets across ${sourceFiles.length} source files).`);
if (unreferenced.length > 0) {
  console.log('Shipped but not referenced by any source file:');
  unreferenced.forEach((path) => console.log(`- public/${path}`));
}
