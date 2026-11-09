// Explicit list items only: prose needs the consent-based assistant, never guess dates.
export function pasteTodos(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.slice(0, 10000).split(/\r?\n/)) {
    if (/^\s*(?:[-*•]\s*)?\[[xX✓]\]/.test(line) || /^\s*(?:✅|☑)/u.test(line)) continue;
    const match = /^\s*(?:[-*•]\s+|\d+[.)]\s+|\[ \]\s*|☐\s*)(.+)$/u.exec(line);
    if (!match) continue;
    const title = match[1].replace(/^\[ \]\s*/, '').trim();
    if (title && title.length <= 120) seen.add(title);
    if (seen.size === 20) break;
  }
  return [...seen];
}
