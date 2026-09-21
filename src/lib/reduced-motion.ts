"use client";

import { useSyncExternalStore } from "react";

// Whether the visitor asked for less motion.
//
// This looks like a one-liner and isn't, because of hydration. The obvious
// version —
//
//   const still = useMemo(() => typeof window !== "undefined" && mq.matches, [])
//
// — evaluates on the server as `false` and on the client's very first render
// as the real answer. React runs lazy initialisers in both places, so a
// `typeof window` guard doesn't avoid the mismatch, it *is* the mismatch: the
// server sends one tree, the client builds another, and React throws #418 and
// discards the server HTML.
//
// useSyncExternalStore exists for exactly this. It takes a separate server
// snapshot, renders that during hydration so the trees agree, and re-renders
// with the real value immediately after — and because the media query is a
// subscription, a visitor who changes the setting gets the new behaviour
// without a reload.
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // the server cannot know; assume motion and correct after mount
  );
}
