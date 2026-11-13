"use client";
import Link, { useLinkStatus } from "next/link";
import { useSite } from "./context";
import type { ComponentProps } from "react";
type LocalLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  to?: string;
  href?: string;
  autoAddBaseUrl?: boolean;
};
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
  onNavigate,
  ...props
}: LocalLinkProps) {
  const { locale } = useSite();
  let target = to || href || "/";
  if (
    locale !== "zh-CN" &&
    /^\/(?!\/|en(?:\/|$)|zh-TW(?:\/|$))/.test(target) &&
    !/\.(svg|png|jpg|xml|json|pdf)$/.test(target)
  )
    target = "/" + locale + (target === "/" ? "" : target);
  const navigate: NonNullable<LocalLinkProps["onNavigate"]> = (event) => {
    let cancelled = false;
    onNavigate?.({
      preventDefault: () => {
        cancelled = true;
        event.preventDefault();
      },
    });
    if (cancelled || props.scroll === false) return;
    let id;
    try {
      const url = new URL(target, location.href);
      if (!url.hash || url.href !== location.href) return;
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      return;
    }
    const element = document.getElementById(id);
    if (!element) return;
    // The URL is already selected: repeat the fragment action without adding
    // a duplicate route or relying on a router/hash-change notification.
    event.preventDefault();
    for (
      let parent: HTMLElement | null = element;
      parent;
      parent = parent.parentElement
    )
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    requestAnimationFrame(() => {
      if (element.isConnected)
        element.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
  return (
    <Link href={target} {...props} onNavigate={navigate}>
      {children}
      <Pending />
    </Link>
  );
}
