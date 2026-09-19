export function streamSnapshot(parts, count, state = "running") {
  const complete = count >= parts.length && state === "running";
  return {
    partial: parts.slice(0, count).join(""),
    buffered: complete ? parts.join("") : "",
    complete,
  };
}
