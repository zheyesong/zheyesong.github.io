import { chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'public', 'assets', 'kinetic-head-master.webp');
const output = join(root, 'public', 'assets', 'kinetic-head-master.avif');

await sharp(source)
  .avif({
    quality: 72,
    effort: 6,
    chromaSubsampling: '4:4:4',
  })
  .toFile(output);

await chmod(output, 0o644);
console.log(`Generated ${output}.`);
