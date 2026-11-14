import * as T from "three";

export type ArtworkTextureSources = Partial<
  Record<"obsidian" | "paper" | "linen", string>
>;
export interface ArtworkTextureOptions {
  textureSources?: ArtworkTextureSources;
  onTextureReady?: () => void;
  maxAnisotropy?: number;
}

// Local, seamless material maps are added here once approved assets are available.
export const artworkTextureSources: ArtworkTextureSources = {
  obsidian: "/media/artwork/obsidian-albedo.webp",
  paper: "/media/artwork/paper-albedo.webp",
  linen: "/media/artwork/linen-albedo.webp",
};

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Surface = T.MeshStandardMaterial;
const settings = {
  obsidian: { repeat: [1.5, 2] as const, bump: 0.012 },
  paper: { repeat: [1, 2] as const, bump: 0.005 },
  linen: { repeat: [2.5, 2] as const, bump: 0.016 },
};

/** One load per used material family, with procedural maps retained on failure. */
export function createArtworkTextureBinder(
  keep: Keep,
  options: ArtworkTextureOptions = {},
) {
  let active = true;
  keep({
    dispose() {
      active = false;
    },
  });
  const entries = new Map<
    keyof ArtworkTextureSources,
    {
      targets: Surface[];
      color?: T.Texture;
      bump?: T.Texture;
      roughness?: T.Texture;
    }
  >();
  const loader = new T.TextureLoader();
  return (family: keyof ArtworkTextureSources, material: Surface) => {
    const url = options.textureSources?.[family];
    if (!url || !active) return;
    const profile = settings[family];
    const assign = (
      entry: NonNullable<ReturnType<typeof entries.get>>,
      target: Surface,
    ) => {
      if (!entry.color || !entry.bump) return;
      target.map = entry.color;
      target.color.set("#ffffff");
      target.bumpMap = entry.bump;
      target.bumpScale = profile.bump;
      if (entry.roughness) target.roughnessMap = entry.roughness;
      target.needsUpdate = true;
    };
    const existing = entries.get(family);
    if (existing) {
      existing.targets.push(material);
      assign(existing, material);
      return;
    }
    const entry: NonNullable<ReturnType<typeof entries.get>> = {
      targets: [material],
    };
    entries.set(family, entry);
    const configure = (texture: T.Texture) => {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.repeat.set(profile.repeat[0], profile.repeat[1]);
      texture.anisotropy = Math.max(1, Math.min(4, options.maxAnisotropy ?? 1));
      return texture;
    };
    const texture = loader.load(
      url,
      (loaded) => {
        // ImageLoader cannot abort an in-flight image; a disposed scene never
        // mutates materials, allocates new GPU maps, or requests another render.
        if (!active) return;
        loaded.colorSpace = T.SRGBColorSpace;
        entry.color = loaded;
        entry.bump = keep(configure(loaded.clone()));
        entry.bump.colorSpace = T.NoColorSpace;
        entry.bump.needsUpdate = true;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(loaded.image, 0, 0, 256, 256);
            const pixels = ctx.getImageData(0, 0, 256, 256);
            for (let i = 0; i < pixels.data.length; i += 4) {
              // Preserve fibers without turning dark stone into a mirror.
              const value = 199 + pixels.data[i] * 0.2;
              pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
              pixels.data[i + 3] = 255;
            }
            ctx.putImageData(pixels, 0, 0);
            entry.roughness = keep(configure(new T.CanvasTexture(canvas)));
            entry.roughness.colorSpace = T.NoColorSpace;
          }
        } catch {
          // Base color and relief remain usable if CPU image access is unavailable.
        }
        entry.targets.forEach((target) => assign(entry, target));
        options.onTextureReady?.();
      },
      undefined,
      () => {
        /* Keep the existing procedural fallback. */
      },
    );
    keep(configure(texture));
  };
}
