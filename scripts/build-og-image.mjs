import { chmod, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import palette from '../src/data/palette.json' with { type: 'json' };

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, 'public/assets/og-image.jpg');
const { site, profile } = JSON.parse(await readFile(join(root, 'src/data/profile.json'), 'utf8'));
const head = await readFile(join(root, 'public/assets/kinetic-head-rest.webp'));
const serif = await readFile(join(root, 'node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff'));
const inter = await readFile(join(root, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff'));
const card = {
  type: 'div',
  props: {
    style: { display: 'flex', position: 'relative', width: '1200px', height: '630px', backgroundColor: palette.paper, color: palette.ink },
    children: [
      { type: 'div', props: { style: { position: 'absolute', left: '64px', right: '64px', top: '48px', height: '1px', backgroundColor: palette.line } } },
      { type: 'div', props: {
        style: { display: 'flex', flexDirection: 'column', position: 'absolute', left: '440px', top: '136px', width: '680px', fontFamily: 'Source Serif 4' },
        children: [
          { type: 'div', props: { style: { fontSize: '76px', lineHeight: 1.1 }, children: profile.name } },
          { type: 'div', props: { style: { fontFamily: 'Inter', color: palette.accent, marginTop: '24px', fontSize: '18px' }, children: site.email } },
          { type: 'div', props: { style: { marginTop: '40px', fontSize: '24px', lineHeight: 1.4 }, children: profile.statement } },
        ],
      } },
      { type: 'div', props: { style: { position: 'absolute', left: '64px', right: '64px', bottom: '64px', height: '1px', backgroundColor: palette.line } } },
      { type: 'div', props: { style: { position: 'absolute', left: '64px', bottom: '28px', fontFamily: 'Inter', color: palette.muted, fontSize: '14px' }, children: site.url.replace(/^https?:\/\//, '') } },
    ],
  },
};
const svg = await satori(card, {
  width: 1200, height: 630,
  fonts: [
    { name: 'Source Serif 4', data: serif, weight: 400, style: 'normal' },
    { name: 'Inter', data: inter, weight: 400, style: 'normal' },
  ],
});
const portrait = await sharp(head).resize({ width: 304, height: 432, fit: 'contain', background: palette.paper }).png().toBuffer();
const generated = await sharp(Buffer.from(svg))
  .composite([{ input: portrait, left: 96, top: 96 }])
  .jpeg({ quality: 89, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toBuffer();
if (process.argv.includes('--check')) {
  const current = await readFile(outputPath).catch(() => null);
  if (!current?.equals(generated)) {
    console.error('OG image is stale. Run npm run build:og and commit the result.');
    process.exit(1);
  }
  console.log(`OG image check passed (${generated.length} bytes).`);
} else {
  await writeFile(outputPath, generated);
  await chmod(outputPath, 0o644);
  console.log(`Generated ${outputPath} (${generated.length} bytes).`);
}
