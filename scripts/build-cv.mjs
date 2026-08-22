import { copyFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'cv', 'Zheye-Song-CV.tex');
const buildDirectory = join(root, '.cv-build');
const builtPdf = join(buildDirectory, 'Zheye-Song-CV.pdf');
const publicPdf = join(root, 'public', 'Zheye-Song-CV.pdf');

await mkdir(buildDirectory, { recursive: true });

const result = spawnSync('latexmk', [
  '-norc',
  '-pdf',
  '-interaction=nonstopmode',
  '-halt-on-error',
  `-outdir=${buildDirectory}`,
  source,
], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.error?.code === 'ENOENT') {
  throw new Error('latexmk is required to build the CV. Install TeX Live or MacTeX first.');
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await copyFile(builtPdf, publicPdf);
console.log(`Updated ${publicPdf}`);
