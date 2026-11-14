import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createArtworkTextureBinder } from "../components/theme-artwork-textures.ts";

function fixture(t) {
  const pending = [],
    resources = [];
  const original = T.TextureLoader.prototype.load;
  T.TextureLoader.prototype.load = function (url, loaded, progress, failed) {
    const texture = new T.Texture();
    pending.push({ url, loaded, failed, texture });
    return texture;
  };
  t.after(() => {
    T.TextureLoader.prototype.load = original;
  });
  const dispose = () => {
    resources
      .splice(0)
      .reverse()
      .forEach((value) => value.dispose());
  };
  t.after(dispose);
  return {
    pending,
    resources,
    dispose,
    keep(value) {
      resources.push(value);
      return value;
    },
  };
}

test("material families load once, keep fallback until ready, and split color from linear relief", (t) => {
  const f = fixture(t);
  let draws = 0;
  const bind = createArtworkTextureBinder(f.keep, {
    textureSources: { paper: "/paper.webp" },
    maxAnisotropy: 16,
    onTextureReady() {
      draws++;
    },
  });
  const fallback = f.keep(new T.Texture()),
    front = f.keep(new T.MeshStandardMaterial({ map: fallback })),
    reverse = f.keep(new T.MeshStandardMaterial({ map: fallback }));
  bind("paper", front);
  bind("paper", reverse);
  bind("linen", front);
  assert.equal(f.pending.length, 1);
  assert.equal(front.map, fallback);
  f.pending[0].loaded(f.pending[0].texture);
  assert.equal(draws, 1);
  assert.equal(front.map, reverse.map);
  assert.equal(front.color.getHexString(), "ffffff");
  assert.equal(front.map.colorSpace, T.SRGBColorSpace);
  assert.equal(front.bumpMap.colorSpace, T.NoColorSpace);
  assert.notEqual(front.map, front.bumpMap);
  assert.equal(front.map.anisotropy, 4);
  assert.ok(front.bumpScale < 0.01);
});

test("failed and late image loads cannot replace fallback or render a disposed scene", (t) => {
  const f = fixture(t);
  let draws = 0;
  const bind = createArtworkTextureBinder(f.keep, {
    textureSources: { linen: "/linen.webp", obsidian: "/stone.webp" },
    onTextureReady() {
      draws++;
    },
  });
  const fallback = f.keep(new T.Texture()),
    cloth = f.keep(new T.MeshStandardMaterial({ map: fallback })),
    stone = f.keep(new T.MeshStandardMaterial({ map: fallback }));
  bind("linen", cloth);
  bind("obsidian", stone);
  f.pending[0].failed(new Error("offline"));
  assert.equal(cloth.map, fallback);
  f.dispose();
  f.pending[1].loaded(f.pending[1].texture);
  assert.equal(stone.map, fallback);
  assert.equal(draws, 0);
  assert.equal(
    f.resources.length,
    0,
    "late load must not allocate derived textures",
  );
});
