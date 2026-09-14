import { useSyncExternalStore } from "react";

// One breakpoint, shared by CSS (`@media`) and React. Below it the editor renders the phone layout
// (Studio Editor Mobile): preview on top, transport, a horizontally scrolled timeline and a tabbed
// panel behind a bottom dock. Desktop is untouched above it.
export const MOBILE_QUERY = "(max-width: 760px)";
const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(MOBILE_QUERY) : null;
export const isMobile = () => !!mq?.matches;
const subscribe = (cb: () => void) => { mq?.addEventListener("change", cb); return () => mq?.removeEventListener("change", cb); };
export const useMobile = () => useSyncExternalStore(subscribe, isMobile, () => false);
