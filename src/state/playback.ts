import { create } from "zustand";
// Frame/playing live in their own store so the 30fps frame ticks only re-render the few
// components that show them (playhead, timecode), never the timeline or inspector trees.
export const usePlayback = create<{ frame: number; playing: boolean; set: (p: Partial<{ frame: number; playing: boolean }>) => void }>((set) => ({
  frame: 0, playing: false, set: (p) => set(p),
}));
