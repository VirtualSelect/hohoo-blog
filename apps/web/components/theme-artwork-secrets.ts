import type { ArtworkDesign } from "./theme-artwork-config";
import type { Sculpture } from "./theme-artwork-models";
import { makeAtlasSecret } from "./encore-atlas";
import { makeMachineSecret } from "./encore-machine";
import { makePaperSecret } from "./encore-paper";

type Keep = <V extends { dispose(): void }>(value: V) => V;
export function createArtworkSecret(
  design: ArtworkDesign,
  keep: Keep,
): Sculpture {
  const build = {
    space: makeAtlasSecret,
    map: makeAtlasSecret,
    clear: makeMachineSecret,
    photo: makeMachineSecret,
    construct: makeMachineSecret,
    classic: makePaperSecret,
    garden: makePaperSecret,
    chapters: makePaperSecret,
  }[design];
  const sculpture = build(design, keep);
  sculpture.root.name = `secret-${design}`;
  return sculpture;
}
