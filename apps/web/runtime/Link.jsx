"use client";
import Link from "next/link";
import { useSite } from "./context";
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
    </Link>
  );
}
