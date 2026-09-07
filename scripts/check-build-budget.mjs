import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
const document = parse(indexHtml);
const eagerScripts = [];
const stylesheets = [];

function visit(node) {
  if (node.tagName === 'script') {
    const src = node.attrs?.find((attribute) => attribute.name === 'src')?.value;
    if (src) eagerScripts.push(src);
  }
  if (node.tagName === 'link') {
    const rel = node.attrs?.find((attribute) => attribute.name === 'rel')?.value;
    const href = node.attrs?.find((attribute) => attribute.name === 'href')?.value;
    if (rel === 'stylesheet' && href) stylesheets.push(href);
  }
  node.childNodes?.forEach(visit);
}
visit(document);

const assetPath = (url) => join(dist, url.replace(/^\//, ''));
const sizeOf = async (url) => (await stat(assetPath(url))).size;
const failures = [];
const avifSize = (await stat(join(dist, 'assets', 'kinetic-head-rest.avif'))).size;
if (avifSize >= 50 * 1024) failures.push(`Homepage AVIF is ${avifSize} bytes; budget is < 50 KB`);

const scriptSizes = await Promise.all(eagerScripts.map(sizeOf));
const eagerScriptTotal = scriptSizes.reduce((sum, size) => sum + size, 0);
if (eagerScriptTotal >= 10 * 1024) {
  failures.push(`Eager homepage scripts total ${eagerScriptTotal} bytes; budget is < 10 KB`);
}

const stylesheetSizes = await Promise.all(stylesheets.map(sizeOf));
const stylesheetTotal = stylesheetSizes.reduce((sum, size) => sum + size, 0);
if (stylesheetTotal >= 40 * 1024) {
  failures.push(`Homepage styles total ${stylesheetTotal} bytes; budget is < 40 KB`);
}

const forbiddenEagerAssets = ['three.core', 'GLTFLoader', '/kinetic-head.', 'kinetic-head.glb', 'kinetic-head-texture'];
for (const asset of [...eagerScripts, ...stylesheets]) {
  if (forbiddenEagerAssets.some((fragment) => asset.includes(fragment))) {
    failures.push(`3D runtime asset is eagerly referenced: ${asset}`);
  }
}

const astroFiles = await readdir(join(dist, '_astro'));
if (!astroFiles.some((file) => file.startsWith('kinetic-head.'))) {
  failures.push('Expected the interaction-only kinetic-head chunk to exist');
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Build budget passed: AVIF ${avifSize} B, eager JS ${eagerScriptTotal} B, CSS ${stylesheetTotal} B.`,
);
