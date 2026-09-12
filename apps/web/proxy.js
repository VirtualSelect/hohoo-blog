import { NextResponse } from "next/server";
export function proxy(request) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-lab-locale",
    request.nextUrl.pathname.startsWith("/en/") ||
      request.nextUrl.pathname === "/en"
      ? "en"
      : request.nextUrl.pathname.startsWith("/zh-TW/") ||
          request.nextUrl.pathname === "/zh-TW"
        ? "zh-TW"
        : "zh-CN",
  );
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!_next|img|fonts|favicon|.*\\..*).*)"] };
