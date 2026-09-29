// A fixed display zone keeps SSR and hydration identical on every device.
// Stored timestamps, intake quotas and ISO weekly archives continue to use UTC.
export function radarDateTime(value) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return "";
  return new Date(stamp + 8 * 3600000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

export function radarDay(value) {
  return radarDateTime(value).slice(0, 10);
}
