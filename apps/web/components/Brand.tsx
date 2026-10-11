/** Decorative artwork; the enclosing home link supplies its localized name. */
export default function Brand() {
  return (
    <span className="brand-logo" aria-hidden="true">
      <img
        className="brand-logo-light"
        src="/brand/hohoo-startrail-light.svg"
        width="980"
        height="268"
        alt=""
        decoding="async"
      />
      <img
        className="brand-logo-dark"
        src="/brand/hohoo-startrail-dark.svg"
        width="980"
        height="268"
        alt=""
        decoding="async"
      />
    </span>
  );
}
