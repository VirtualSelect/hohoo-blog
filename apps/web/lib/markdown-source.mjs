// MDX component imports are not prose; imports inside fenced examples are code.
export function stripMdxImports(source) {
  let fence = null;
  return source
    .split(/\r?\n/)
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (marker) {
        if (!fence)
          fence = { character: marker[1][0], length: marker[1].length };
        else if (
          marker[1][0] === fence.character &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = null;
        return line;
      }
      if (
        !fence &&
        /^import\s+(?:.+\s+from\s+)?["'][^"']+["'];?\s*$/.test(line)
      )
        return "";
      return line;
    })
    .join("\n");
}
