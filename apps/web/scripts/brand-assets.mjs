import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Production vector reconstruction of the approved original “Hohoo · 星轨”.
// Keep the open arch and rising cut; the rejected circular-counter variants
// are intentionally not used. All web assets below share this geometry.
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const output = path.join(root, "static/brand");
const palette = {
  ink: "#29483d",
  paper: "#f5f2e9",
  gold: "#b49c69",
  night: "#14222c",
};
const body = [
  "M0 178V67C0 52 10 43 25 43H31C47 43 56 52 56 67V133C37 147 17 163 0 178Z",
  "M139 111V67C139 52 149 43 164 43H170C186 43 195 52 195 67V130C178 121 159 115 139 111Z",
  "M0 195C43 151 87 128 133 128C157 128 178 135 195 146V239C195 254 185 260 171 260H162C147 260 139 252 139 238V203C139 181 123 169 101 169C79 169 56 181 56 203V238C56 253 46 260 32 260H25C9 260 0 253 0 239Z",
];
const star =
  "M230 0C236 25 239 29 267 39C239 48 236 52 230 78C223 53 219 49 193 40C219 32 224 28 230 0Z";
const mark = (ink, gold) =>
  `<g fill="${ink}">${body.map((d) => `<path d="${d}"/>`).join("")}</g><path fill="${gold}" d="${star}"/>`;

// Outlined letters avoid font downloads, fallback changes and layout shifts.
const capitalH =
  "M7 0H30Q38 0 38 8V61H101V8Q101 0 109 0H132Q139 0 139 8V150Q139 158 132 158H109Q101 158 101 150V97H38V150Q38 158 30 158H7Q0 158 0 150V8Q0 0 7 0Z";
const lowerH =
  "M7 0H29Q36 0 36 7V54C45 45 56 41 70 41C101 41 121 63 121 95V158H85V100C85 82 76 73 63 73C46 73 36 84 36 101V158H0V7Q0 0 7 0Z";
const roundO =
  "M60 0A60 60 0 1 1 60 120A60 60 0 1 1 60 0ZM60 35A25 25 0 1 0 60 85A25 25 0 1 0 60 35Z";
const word = (ink) =>
  `<g fill="${ink}"><path d="${capitalH}"/><path fill-rule="evenodd" transform="translate(151 40)" d="${roundO}"/><path transform="translate(284 0)" d="${lowerH}"/><path fill-rule="evenodd" transform="translate(418 40)" d="${roundO}"/><path fill-rule="evenodd" transform="translate(551 40)" d="${roundO}"/></g>`;
const lockup = (ink) =>
  `${mark(ink, palette.gold)}<g transform="translate(298 76)">${word(ink)}</g>`;
const svg = (width, height, content, label = "Hohoo") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${content}</svg>\n`;

await fs.mkdir(output, { recursive: true });
const assets = {
  "hohoo-startrail-light.svg": svg(980, 268, lockup(palette.ink)),
  "hohoo-startrail-dark.svg": svg(980, 268, lockup(palette.paper)),
  "hohoo-startrail-mark.svg": svg(
    280,
    280,
    `<g transform="translate(6 10)">${mark(palette.ink, palette.gold)}</g>`,
  ),
  "hohoo-startrail-mark-dark.svg": svg(
    280,
    280,
    `<g transform="translate(6 10)">${mark(palette.paper, palette.gold)}</g>`,
  ),
};
// Same optical anchor as the approved brand-kit avatar: the H carries more
// visual weight than the star. Keep its 56% scale and space for a round crop.
const avatarSize = 512;
const avatarScale = (avatarSize * 0.56) / 280;
for (const [theme, background, foreground] of [
  ["light", palette.paper, palette.ink],
  ["dark", palette.night, palette.paper],
]) {
  assets[`hohoo-startrail-avatar-${theme}.svg`] = svg(
    avatarSize,
    avatarSize,
    `<circle cx="256" cy="256" r="256" fill="${background}"/><g transform="translate(${avatarSize / 2 - 110 * avatarScale} ${avatarSize / 2 - 158 * avatarScale}) scale(${avatarScale})"><g transform="translate(6 10)">${mark(foreground, palette.gold)}</g></g>`,
    "Hohoo Startrail avatar",
  );
}
// Author metadata and existing links have no site theme context.
assets["hohoo-startrail-avatar.svg"] =
  assets["hohoo-startrail-avatar-dark.svg"];
// A stable dark tile keeps the favicon visible in both browser chrome themes.
const icon = svg(
  320,
  320,
  `<rect width="320" height="320" rx="64" fill="${palette.night}"/><g transform="translate(47 44) scale(.85)">${mark(palette.paper, palette.gold)}</g>`,
);
assets["hohoo-startrail-icon.svg"] = icon;
await Promise.all(
  Object.entries(assets).map(([name, data]) =>
    fs.writeFile(path.join(output, name), data),
  ),
);
const iconPng = async (size) =>
  sharp(Buffer.from(icon)).resize(size, size).png().toBuffer();
await fs.writeFile(
  path.join(output, "hohoo-startrail-32.png"),
  await iconPng(32),
);
await fs.writeFile(
  path.join(output, "hohoo-startrail-apple.png"),
  await iconPng(180),
);

// ICO with PNG frames: supported by current browsers, including direct /favicon.ico requests.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(iconPng));
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
for (const [i, frame] of frames.entries()) {
  const cursor = 6 + i * 16;
  header[cursor] = header[cursor + 1] = sizes[i];
  header.writeUInt16LE(1, cursor + 4);
  header.writeUInt16LE(32, cursor + 6);
  header.writeUInt32LE(frame.length, cursor + 8);
  header.writeUInt32LE(offset, cursor + 12);
  offset += frame.length;
}
const ico = Buffer.concat([header, ...frames]);
await fs.writeFile(path.join(output, "hohoo-startrail.ico"), ico);
await fs.writeFile(path.join(root, "static/favicon.ico"), ico);
// Preserve legacy public asset URLs while removing the old framework logo.
await fs.writeFile(
  path.join(root, "static/img/logo.svg"),
  assets["hohoo-startrail-mark.svg"],
);
await fs.writeFile(path.join(root, "static/img/hohoo.ico"), ico);

const share = svg(
  1200,
  630,
  `<rect width="1200" height="630" fill="${palette.paper}"/><g transform="translate(130 155) scale(.96)">${lockup(palette.ink)}</g><path d="M100 480H1100" stroke="#d5dbd0"/><g fill="${palette.ink}" font-family="Segoe UI, Arial, sans-serif"><text x="100" y="538" font-size="24">Hohoo’s AI Lab</text><text x="1100" y="538" font-size="22" text-anchor="end">huhohoo.com</text></g>`,
);
await fs.writeFile(
  path.join(output, "hohoo-startrail-share.png"),
  await sharp(Buffer.from(share)).png().toBuffer(),
);
const total = (
  await Promise.all(
    (await fs.readdir(output)).map(
      async (name) => (await fs.stat(path.join(output, name))).size,
    ),
  )
).reduce((a, b) => a + b, 0);
console.log(
  `Hohoo startrail assets generated: ${total} bytes, including the 1200×630 sharing image.`,
);
