import type { Metadata } from "next";

export const brandIcons: Metadata["icons"] = {
  icon: [
    { url: "/brand/hohoo-startrail-32.png", sizes: "32x32", type: "image/png" },
    {
      url: "/brand/hohoo-startrail-icon.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ],
  shortcut: "/brand/hohoo-startrail.ico",
  apple: {
    url: "/brand/hohoo-startrail-apple.png",
    sizes: "180x180",
    type: "image/png",
  },
};

export const brandShareImage = {
  url: "/brand/hohoo-startrail-share.png",
  width: 1200,
  height: 630,
  alt: "Hohoo · Hohoo’s AI Lab",
};
