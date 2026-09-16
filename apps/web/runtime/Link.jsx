"use client";
import Link, { useLinkStatus } from "next/link";
import { useSite } from "./context";
function Pending() {
  const { pending } = useLinkStatus();
  const { locale } = useSite();
  if (!pending) return null;
  return (
    <span className="navigation-pending" role="status">
      {locale === "en"
        ? "Opening…"
        : locale === "zh-TW"
          ? "正在開啟…"
          : "正在打开…"}
    </span>
  );
}
export default function LocalLink({
  to,
  href,
  children,
  autoAddBaseUrl,
  ...props
}) {
  const { locale } = useSite();
  let target = to || href || "/";
  if (
    locale !== "zh-CN" &&
    /^\/(?!\/|en(?:\/|$)|zh-TW(?:\/|$))/.test(target) &&
    !/\.(svg|png|jpg|xml|json|pdf)$/.test(target)
  )
    target = "/" + locale + (target === "/" ? "" : target);
  return (
    <Link href={target} {...props}>
      {children}
      <Pending />
    </Link>
  );
}
