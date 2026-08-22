export function getReadingStats(source: string) {
  const plainText = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|=-]/g, ' ');

  const latinWords = plainText.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
  const hanCharacters = plainText.match(/[\u3400-\u9fff]/g) ?? [];
  const words = latinWords.length + hanCharacters.length;

  return {
    words,
    minutes: Math.max(1, Math.ceil(words / 220)),
  };
}

export function formatWritingDate(date: string, style: 'short' | 'long') {
  const value = new Date(`${date}T00:00:00.000Z`);

  return value.toLocaleDateString('en', {
    year: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
