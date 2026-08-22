import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const profile = JSON.parse(await readFile(join(root, 'src', 'data', 'profile.json'), 'utf8'));
const tex = await readFile(join(root, 'cv', 'Zheye-Song-CV.tex'), 'utf8');

function normalize(value) {
  return value
    .toLowerCase()
    .replaceAll('\\_', '_')
    .replaceAll('--', '-')
    .replaceAll('sept', 'sep')
    .replace(/\s+/g, ' ')
    .trim();
}

const source = normalize(tex);
const requiredFacts = [
  profile.profile.name,
  profile.site.email,
  ...profile.profile.researchInterests,
  ...profile.profile.education.flatMap((entry) => [
    entry.institution,
    entry.degree,
    entry.score,
    entry.period,
  ]),
  ...profile.researchProjects.flatMap((project) => [
    project.title,
    project.period,
    project.status,
    project.mentor,
    project.affiliation,
  ]),
  ...profile.awards.flatMap((award) => [award.title, award.institution, award.year]),
];

const missing = requiredFacts.filter((fact) => !source.includes(normalize(fact)));
if (missing.length > 0) {
  console.error('CV source is missing facts present in src/data/profile.json:');
  missing.forEach((fact) => console.error(`- ${fact}`));
  process.exit(1);
}

const blockedLinks = ['https://github.com/zheyesong/SRH-ML-SV'];
const blocked = blockedLinks.filter((link) => tex.includes(link));
if (blocked.length > 0) {
  console.error('CV source contains links that must not be published:');
  blocked.forEach((link) => console.error(`- ${link}`));
  process.exit(1);
}

console.log(`CV fact check passed (${requiredFacts.length} facts).`);
