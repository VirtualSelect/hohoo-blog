export const blankReflection = () => ({ takeaway: "", question: "", next: "" });
export const reflectionKey = (route) => `huhohoo.reflection.v1:${route}`;

// The route has no locale prefix: translations share the same personal note.
// Unknown versions are kept intact instead of being silently downgraded.
export function decodeReflection(raw) {
  if (raw === null) return blankReflection();
  const record = JSON.parse(raw);
  if (record?.version !== 1) throw new Error("Unsupported reflection version");
  const result = blankReflection();
  for (const field of Object.keys(result)) {
    if (typeof record[field] !== "string" || record[field].length > 4000)
      throw new Error("Invalid reflection field");
    result[field] = record[field];
  }
  return result;
}

export function reflectionMarkdown(title, url, fields, labels) {
  return `# ${title}\n\n${url}\n\n${Object.entries(fields)
    .filter(([, text]) => text.trim())
    .map(([key, text]) => `## ${labels[key]}\n\n${text.trim()}`)
    .join("\n\n")}\n`;
}
