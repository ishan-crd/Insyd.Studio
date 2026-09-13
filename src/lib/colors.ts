// Scene colours: a fixed, well-separated palette, cycled by scene index.
export const SCENE_COLORS = ["#6D7CFF", "#E9573F", "#22B07D", "#F5B324", "#B96BFF", "#2FA8E0", "#FF6FB5", "#7FB33A", "#FF8A3D", "#4F6BED", "#D9534F"];
export const sceneColor = (i: number) => SCENE_COLORS[i % SCENE_COLORS.length];
