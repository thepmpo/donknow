export const MAX_NOTES_LENGTH = 4000;
export function formatNoteEdit(previous: string, input: string): { text: string; caret?: number } {
  let text = input.replace(/^([\t ]*)- /gm, '$1• ');
  let first = 0;
  while (first < previous.length && first < input.length && previous[first] === input[first]) first++;
  // Adjacent newlines share a prefix: prefer the end of the preceding bullet.
  if(first>0&&input[first]==='\n'&&previous[first-1]==='\n'&&/^([\t ]*)[•-] .+/.test(previous.slice(previous.lastIndexOf('\n',first-2)+1,first-1)))first--;
  // Continue a bullet only for a single inserted Enter, not for a paste/IME edit.
  if (input.length === previous.length + 1 && input[first] === '\n' && input.slice(first + 1) === previous.slice(first)) {
    const start = previous.lastIndexOf('\n', first - 1) + 1;
    const line = previous.slice(start, first);
    const bullet = /^([\t ]*)[•-] (.*)$/.exec(line);
    if (bullet) {
      if (!bullet[2].trim()) return { text: (input.slice(0, start) + input.slice(first + 1)).slice(0, MAX_NOTES_LENGTH), caret: start };
      const prefix = bullet[1] + '• ';
      if (text.length + prefix.length <= MAX_NOTES_LENGTH) {
        text = text.slice(0, first + 1) + prefix + text.slice(first + 1);
        return { text, caret: first + 1 + prefix.length };
      }
    }
  }
  return { text: text.slice(0, MAX_NOTES_LENGTH),...(text!==input?{caret:Math.min(text.length,first+Math.max(0,input.length-previous.length))}:{}) };
}
