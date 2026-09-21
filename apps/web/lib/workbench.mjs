// Educational policy only: never use this as an authorization or safety filter.
export function decide({ confidence, threshold, destructive, allowed }) {
  if (!allowed) return "blocked";
  if (destructive) return "review";
  if (
    !Number.isFinite(confidence) ||
    !Number.isFinite(threshold) ||
    confidence < 0 ||
    confidence > 100 ||
    threshold < 0 ||
    threshold > 100
  )
    return "review";
  return confidence >= threshold ? "proceed" : "review";
}

export function inspectJson(text) {
  if (text.length > 20000) return { error: "size" };
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: "syntax" };
  }
  const rows = [];
  const queue = [{ path: "$", value, depth: 0 }];
  let cursor = 0;
  while (cursor < queue.length && rows.length < 100) {
    const node = queue[cursor++];
    const type =
      node.value === null
        ? "null"
        : Array.isArray(node.value)
          ? "array"
          : typeof node.value;
    rows.push({ path: node.path, type });
    if (
      node.value !== null &&
      typeof node.value === "object" &&
      node.depth < 8
    ) {
      for (const [key, child] of Object.entries(node.value).slice(0, 100)) {
        queue.push({
          path: Array.isArray(node.value)
            ? `${node.path}[${key}]`
            : `${node.path}[${JSON.stringify(key)}]`,
          value: child,
          depth: node.depth + 1,
        });
      }
    }
  }
  return {
    rows,
    limited: cursor < queue.length || rows.some((r) => r.path.length > 500),
  };
}
