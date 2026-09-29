export const WORLD_SIZE = 2000;
export const WORLD_CENTER = 1000;
export const SCENE_SCALE = 0.01; // 2000 world px → 20 three.js units

export function worldToScene(worldX: number, worldY: number): [number, number, number] {
  return [
    (worldX - WORLD_CENTER) * SCENE_SCALE,
    (worldY - WORLD_CENTER) * SCENE_SCALE,
    0, // keep targets on z=0 plane (Phase 1 = 2.5D)
  ];
}
