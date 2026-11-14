/** Bound the actual drawing buffer, including fullscreen and high-DPI phones. */
export function artworkPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  mobile: boolean,
  reducedQuality: boolean,
) {
  const budget = reducedQuality ? 1_250_000 : mobile ? 2_000_000 : 4_000_000;
  const cap = reducedQuality ? 1 : mobile ? 1.75 : 2;
  return Math.min(
    Math.max(1, deviceRatio || 1),
    cap,
    Math.sqrt(budget / Math.max(1, width * height)),
  );
}
