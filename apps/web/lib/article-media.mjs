// Markdown videos use reviewed local assets; never embed remote tracking players.
export function articleVideo(tagName, attrs) {
  const dimension = (value) =>
    typeof value === "string" &&
    /^[1-9]\d{0,3}$/.test(value) &&
    Number(value) <= 4096;
  const hasDimensions = dimension(attrs.width) && dimension(attrs.height);
  const asset = (value, ext) =>
    typeof value === "string" &&
    new RegExp(`^/media/practice/[a-z0-9-]+\\.(?:${ext})$`).test(value);
  if (!asset(attrs.src, "mp4")) return { tagName: "span", attribs: {} };
  return {
    tagName: "video",
    attribs: {
      src: attrs.src,
      ...(asset(attrs.poster, "png|webp") ? { poster: attrs.poster } : {}),
      controls: "",
      preload: "none",
      playsinline: "",
      width: hasDimensions ? attrs.width : "960",
      height: hasDimensions ? attrs.height : "640",
      ...(attrs["aria-label"] ? { "aria-label": attrs["aria-label"] } : {}),
    },
  };
}
