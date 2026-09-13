// Scene colours: muted so they read as labels, not decoration. Cycled by scene index.
export const SCENE_COLORS = ["#3B7DD8", "#D95F6E", "#2E9E6B", "#D8A23A", "#2A9D9F", "#E0733A", "#7B61D9", "#C9527F", "#5E8F3A", "#3A8FB8", "#B8743A"];
export const sceneColor = (i: number) => SCENE_COLORS[i % SCENE_COLORS.length];
