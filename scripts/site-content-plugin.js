import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';

const VIRTUAL_ID = 'virtual:site-content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function isAllowedHref(value) {
  if (!value) return false;
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return false;
  if (/^(https?:|mailto:|#|\?)/i.test(value)) return true;
  if (value.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return true;
}

function sanitizeHref(href) {
  const value = String(href ?? '').trim();
  return isAllowedHref(value) ? value : '#';
}

function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href ?? ''));
}

function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false
  });

  md.validateLink = href => isAllowedHref(String(href ?? '').trim());
  const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    if (hrefIndex >= 0) {
      const safeHref = sanitizeHref(token.attrs[hrefIndex][1]);
      token.attrs[hrefIndex][1] = safeHref;
      if (isExternalHref(safeHref)) {
        token.attrSet('target', '_blank');
        token.attrSet('rel', 'noopener noreferrer');
      }
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}

function markdownToPlain(markdown) {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/[*_>#~`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFrontmatterValue(rawValue) {
  const value = rawValue.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(item => parseFrontmatterValue(item.trim()));
  }
  return value;
}

function parseMarkdownDocument(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };

  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const at = line.indexOf(':');
    if (at < 0) return;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1);
    if (key) frontmatter[key] = parseFrontmatterValue(value);
  });

  return {
    frontmatter,
    body: match[2].trim()
  };
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (!value) return [];
  return String(value).split(',').map(item => item.trim()).filter(Boolean);
}

function fallbackSlug(path) {
  return basename(path).replace(/\.md$/i, '');
}

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(file => /\.md$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
    .map(file => join(dir, file));
}

function normalizeEntry(filePath, raw, md, pageFile, readerFile = '', readerParam = 'post') {
  const parsed = parseMarkdownDocument(raw);
  const meta = parsed.frontmatter;
  const slug = String(meta.slug || fallbackSlug(filePath));
  const draft = meta.draft === true || String(meta.draft).toLowerCase() === 'true';
  const tags = normalizeStringList(meta.tags);
  const directoryHref = pageFile + '#' + slug;
  const readerHref = readerFile ? readerFile + '?' + readerParam + '=' + encodeURIComponent(slug) : '';

  return {
    id: slug,
    slug,
    title: String(meta.title || slug),
    date: String(meta.date || ''),
    status: String(meta.status || ''),
    summary: String(meta.summary || ''),
    tags,
    sourceType: String(meta.sourceType || ''),
    authors: normalizeStringList(meta.authors),
    year: String(meta.year || ''),
    venue: String(meta.venue || ''),
    sourceTitle: String(meta.sourceTitle || ''),
    url: String(meta.url || meta.sourceUrl || ''),
    order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : 999,
    draft,
    href: readerHref || directoryHref,
    directoryHref,
    readerParam,
    html: md.render(parsed.body),
    plain: markdownToPlain(parsed.body)
  };
}

function normalizeCollection(rootDir, collectionDir, md, pageFile, readerFile = '', readerParam = 'post') {
  const dir = resolve(rootDir, 'content', collectionDir);
  return listMarkdownFiles(dir)
    .map(filePath => normalizeEntry(filePath, readFileSync(filePath, 'utf8'), md, pageFile, readerFile, readerParam))
    .filter(entry => !entry.draft)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(b.date).localeCompare(String(a.date));
    });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function withRenderedPageCopy(site, md) {
  const pages = {};
  Object.entries(site.pages || {}).forEach(([key, page]) => {
    pages[key] = {
      ...page,
      introHtml: md.render(String(page.introMarkdown || page.description || ''))
    };
  });
  return { ...site, pages };
}

function buildContent(rootDir) {
  const md = createMarkdownRenderer();
  const site = withRenderedPageCopy(readJson(resolve(rootDir, 'content/site.json')), md);
  const profile = readJson(resolve(rootDir, 'content/profile.json'));

  return {
    site,
    profile,
    collections: {
      blog: normalizeCollection(rootDir, 'blog', md, 'blog.html', 'blog-read.html'),
      reading: normalizeCollection(rootDir, 'reading', md, 'reading.html', 'reading-read.html', 'note')
    }
  };
}

export function siteContentPlugin(rootDir = process.cwd()) {
  const root = resolve(rootDir);

  return {
    name: 'site-content',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;

      const watched = [
        resolve(root, 'content/site.json'),
        resolve(root, 'content/profile.json'),
        ...listMarkdownFiles(resolve(root, 'content/blog')),
        ...listMarkdownFiles(resolve(root, 'content/reading'))
      ];
      watched.forEach(file => this.addWatchFile(file));

      return 'export const content = ' + JSON.stringify(buildContent(root)) + ';\n';
    },
    configureServer(server) {
      server.watcher.add([
        resolve(root, 'content/site.json'),
        resolve(root, 'content/profile.json'),
        resolve(root, 'content/blog'),
        resolve(root, 'content/reading')
      ]);
    }
  };
}
