const trimJava = (s) => s.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, "");

// JSON.parse accepts duplicate keys. Audit key tokens before using its result.
function duplicateKey(text) {
  const stack = [];
  for (const token of text.matchAll(/"(?:[^"\\]|\\.)*"|[{}\[\]:,]/gs)) {
    const value = token[0],
      top = stack.at(-1);
    if (value === "{") stack.push({ keys: new Set(), key: true });
    else if (value === "[") stack.push({});
    else if (value === "}" || value === "]") stack.pop();
    else if (value === "," && top?.keys) top.key = true;
    else if (value === ":" && top?.keys) top.key = false;
    else if (value[0] === '"' && top?.key) {
      const key = JSON.parse(value);
      if (top.keys.has(key)) return true;
      top.keys.add(key);
    }
  }
  return false;
}

// Educational browser adapter for classification-v1; no requests, no persistence.
export function validateOutput(
  content,
  { unwrap = false, finish = "stop" } = {},
) {
  if (finish !== "stop") return { stage: 1, code: "unfinished_response" };
  if (
    typeof content !== "string" ||
    content.length > 8000 ||
    !trimJava(content)
  )
    return { stage: 1, code: "content_missing_or_too_large" };
  let text = content;
  if (unwrap) {
    const fence = /^```json\r?\n([\s\S]*?)\r?\n```$/.exec(trimJava(content));
    if (fence) {
      if (fence[1].includes("```"))
        return { stage: 2, code: "multiple_or_nested_fences" };
      text = fence[1];
    }
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { stage: 2, code: "invalid_json" };
  }
  if (duplicateKey(text)) return { stage: 2, code: "duplicate_field" };
  const fail = (code) => ({ stage: 3, code });
  if (!data || typeof data !== "object" || Array.isArray(data))
    return fail("object_required");
  if (Object.keys(data).some((key) => !["category", "tags"].includes(key)))
    return fail("unknown_field");
  if (!("category" in data) || !("tags" in data)) return fail("missing_field");
  if (
    !["ai-apps", "llm", "embodied-ai", "needs-review"].includes(data.category)
  )
    return fail("unknown_category");
  if (!Array.isArray(data.tags)) return fail("tags_array_required");
  if (data.tags.length < 1 || data.tags.length > 3) return fail("tag_count");
  const seen = new Set();
  for (const tag of data.tags) {
    if (typeof tag !== "string") return fail("tag_string_required");
    if (!trimJava(tag) || tag !== trimJava(tag))
      return fail("invalid_tag_whitespace");
    if ([...tag].length > 20) return fail("tag_too_long");
    if (/[\x00-\x1f\x7f-\x9f]/.test(tag)) return fail("tag_control_character");
    if (seen.has(tag)) return fail("duplicate_tag");
    seen.add(tag);
  }
  return { stage: 4, code: "accepted", data };
}
