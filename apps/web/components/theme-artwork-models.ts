import type { Group } from "three";
import type { ArtworkDesign } from "./theme-artwork-config";
import { makeInstruments } from "./instruments";
import { makeObservatoryAtlas } from "./observatory-atlas";
import { makePaperGarden } from "./paper-garden";

export interface Sculpture {
  root: Group;
  update(time: number, amount: number): void;
}

export function createSculpture(
  design: ArtworkDesign,
  about: boolean,
  keep: <V extends { dispose(): void }>(value: V) => V,
): Sculpture {
  const build = {
    space: makeObservatoryAtlas,
    clear: makeInstruments,
    classic: makePaperGarden,
    garden: makePaperGarden,
    photo: makeInstruments,
    construct: makeInstruments,
    map: makeObservatoryAtlas,
    chapters: makePaperGarden,
  }[design];
  return build(design, about, keep);
}
