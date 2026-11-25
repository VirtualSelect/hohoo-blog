const passageTypes = new Set(["doc", "blog"]);
const filterPattern = /\b(type|topic):([\w-]+)/gi;

export function isPassageSearchType(type) {
  return passageTypes.has(type);
}

export function inspectPassageQuery(query) {
  const unsupportedTypes = new Set();
  let hasSupportedType = false;
  const cleaned = query.replace(filterPattern, (token, key, value) => {
    if (key.toLowerCase() !== "type") return token;
    const type = value.toLowerCase();
    if (isPassageSearchType(type)) {
      hasSupportedType = true;
      return token;
    }
    unsupportedTypes.add(type);
    return "";
  });
  return {
    unsupportedTypes: [...unsupportedTypes],
    onlyUnsupportedTypes: unsupportedTypes.size > 0 && !hasSupportedType,
    queryWithoutUnsupportedTypes: unsupportedTypes.size
      ? cleaned.trim().replace(/\s+/g, " ")
      : query,
    hasKeywords: Boolean(query.replace(filterPattern, "").trim()),
  };
}
