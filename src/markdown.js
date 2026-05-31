function isAllowedHref(value) {
  if (!value) return false;
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return false;
  if (/^(https?:|mailto:|#|\?)/i.test(value)) return true;
  if (value.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return true;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHref(href) {
  const value = String(href ?? '').trim();
  return isAllowedHref(value) ? value : '#';
}

export function isExternalHref(href) {
  return /^https?:\/\//i.test(String(href ?? ''));
}

export function markdownToPlain(markdown) {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/[*_>#~`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
