import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const siteOrigins = new Set(['https://zheyesong.github.io', 'https://internal.test']);

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectHtml(path);
    return entry.isFile() && extname(entry.name) === '.html' ? [path] : [];
  }));
  return nested.flat();
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function* walkNodes(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* walkNodes(child);
  if (node.content) yield* walkNodes(node.content);
}

function routeForFile(file) {
  const path = relative(dist, file).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path}`;
}

function candidatesForPath(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (pathname.endsWith('/')) return [join(dist, clean, 'index.html')];
  if (extname(clean)) return [join(dist, clean)];
  return [join(dist, clean), join(dist, `${clean}.html`), join(dist, clean, 'index.html')];
}

const htmlFiles = await collectHtml(dist);
const failures = [];
const behaviorFailures = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = routeForFile(file);
  const document = parse(html);

  for (const node of walkNodes(document)) {
    if (!node.attrs) continue;
    const attributes = new Map(node.attrs.map((attribute) => [attribute.name, attribute.value]));

    for (const attributeName of ['href', 'src']) {
      const value = attributes.get(attributeName);
      if (!value || /^(?:mailto:|tel:|data:|javascript:)/i.test(value)) continue;

      const url = new URL(value, `https://internal.test${route}`);
      if (!siteOrigins.has(url.origin)) continue;

      checked += 1;
      const candidates = candidatesForPath(url.pathname);
      const matches = await Promise.all(candidates.map(exists));
      if (!matches.some(Boolean)) failures.push(`${route} -> ${value}`);

      if (node.nodeName === 'a' && attributes.get('target') === '_blank') {
        behaviorFailures.push(`${route} -> ${value}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Missing internal link targets:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

if (behaviorFailures.length > 0) {
  console.error('Internal links must open in the current tab:');
  behaviorFailures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Internal link check passed (${checked} references across ${htmlFiles.length} pages).`);
