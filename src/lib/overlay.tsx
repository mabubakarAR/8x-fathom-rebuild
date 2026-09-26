"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AskThread, Highlight, Ms } from "./types";

// ---------------------------------------------------------------------------
// The mutation overlay
//
// Every read path in this app is server-rendered from the deterministic seed.
// Everything a *viewer* changes — ticking an action item, cutting a clip,
// fixing a misattributed speaker, asking a question — lands here instead: a
// client-side overlay persisted to localStorage and merged over the seed at
// render time.
//
// Why, rather than a database:
//
//  1. A stranger opening the live link gets the workspace as intended, not
//     whatever the previous visitor did to it. For a demo that is judged by
//     people clicking around independently, shared mutable state is a bug.
//  2. Their changes still survive a refresh, which is what "does this feel
//     real" actually requires.
//  3. No credentials, no cold starts, no migration step between me and a
//     working link.
//
// The cost is honest and stated in the README: mutations are per-browser, so
// two people do not see each other's edits. Share links carry their payload in
// the URL precisely so that sharing still crosses the browser boundary.
//
// Every localStorage access is wrapped — it throws in private mode and returns
// empty in a fresh context, and neither should break the page.
// ---------------------------------------------------------------------------

const KEY = "8x-fathom-rebuild.overlay.v1";

export interface SpeakerFix {
  /** Segment whose attribution was corrected. */
  segmentId: string;
  toSpeakerId: string;
}

export interface OverlayState {
  /** actionItemId -> done. Absent means "use the seed value". */
  actionsDone: Record<string, boolean>;
  /** Action items the viewer typed themselves. */
  addedActions: {
    id: string;
    meetingId: string;
    text: string;
    assigneeId: string | null;
    anchorMs: Ms;
  }[];
  addedHighlights: Highlight[];
  removedHighlightIds: string[];
  /** Per-meeting speaker corrections, keyed by meeting. */
  speakerFixes: Record<string, SpeakerFix[]>;
  /** Persisted Ask threads — the thing Fathom throws away on navigate. */
  threads: AskThread[];
  /** Last summary template chosen per meeting. */
  templateChoice: Record<string, string>;
  /** Per-upcoming-meeting capture override, set before the meeting happens. */
  captureChoice: Record<string, string>;
  theme: "light" | "dark" | "system";
  /** Whether the Ask dock is open. Persists so it survives navigation. */
  askOpen?: boolean;
}

const EMPTY: OverlayState = {
  actionsDone: {},
  addedActions: [],
  addedHighlights: [],
  removedHighlightIds: [],
  speakerFixes: {},
  threads: [],
  templateChoice: {},
  captureChoice: {},
  // Dark by default. The product is a dark-room instrument — waveforms,
  // speaker lanes, fifteen hues — and it is simply better looking that way.
  // Light is one click away in the sidebar and fully maintained.
  theme: "dark",
};

function read(): OverlayState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    // Merge over EMPTY so a state written by an older build never yields
    // undefined for a key added since.
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function write(state: OverlayState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode, quota, blocked storage — the app keeps working in memory */
  }
}

interface OverlayApi {
  state: OverlayState;
  ready: boolean;
  setActionDone(id: string, done: boolean, meetingId?: string): void;
  addAction(meetingId: string, text: string, assigneeId: string | null, anchorMs: Ms): void;
  addHighlight(h: Highlight): void;
  removeHighlight(id: string, meetingId?: string): void;
  fixSpeaker(meetingId: string, segmentId: string, toSpeakerId: string): void;
  /** Apply the same correction to every segment currently attributed to `from`. */
  fixSpeakerEverywhere(
    meetingId: string,
    fromSpeakerId: string,
    toSpeakerId: string,
    segmentIds: string[],
  ): void;
  undoSpeakerFixes(meetingId: string): void;
  upsertThread(thread: AskThread): void;
  deleteThread(id: string): void;
  chooseTemplate(meetingId: string, key: string): void;
  setCaptureChoice(upcomingId: string, mode: string): void;
  setTheme(t: OverlayState["theme"]): void;
  setAskOpen(open: boolean): void;
  reset(): void;
}

const Ctx = createContext<OverlayApi | null>(null);

// Write-through.
//
// Every mutation is sent to the server first. If the server accepts it, the
// page is refreshed from the database and NOTHING is kept locally — the
// database is the record. Only when the server is unreachable does the change
// fall back to the local overlay, so a flaky connection degrades to "kept in
// this browser" rather than to "lost". The overlay is the fallback, not the
// store.
async function persist(meetingId: string | undefined, body: Record<string, unknown>): Promise<boolean> {
  if (!meetingId) return false;
  try {
    const r = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/mutate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<OverlayState>(EMPTY);
  const [ready, setReady] = useState(false);
  const first = useRef(true);

  // Hydrate after mount. Rendering EMPTY on the server and on first paint keeps
  // the markup deterministic; the overlay flashes in a frame later, which is
  // the right trade against a hydration mismatch.
  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    write(state);
  }, [state]);

  // Theme is applied to <html> so CSS variables switch without a re-render.
  useEffect(() => {
    if (!ready) return;
    const el = document.documentElement;
    if (state.theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", state.theme);
  }, [state.theme, ready]);

  const api = useMemo<OverlayApi>(() => {
    const patch = (fn: (s: OverlayState) => OverlayState) => setState(fn);
    return {
      state,
      ready,
      setActionDone: (id, done, meetingId) => {
        // Optimistic locally, then the server; on success the local mark is
        // cleared so the refreshed row is the only source.
        patch((s) => ({ ...s, actionsDone: { ...s.actionsDone, [id]: done } }));
        void persist(meetingId, { op: "action.done", id, done }).then((ok) => {
          if (!ok) return;
          patch((s) => { const n = { ...s.actionsDone }; delete n[id]; return { ...s, actionsDone: n }; });
          router.refresh();
        });
      },
      addAction: (meetingId, text, assigneeId, anchorMs) => {
        void persist(meetingId, { op: "action.add", text, assigneeId, anchorMs }).then((ok) => {
          if (ok) { router.refresh(); return; }
          patch((s) => ({
            ...s,
            addedActions: [...s.addedActions, { id: `ua-${Date.now().toString(36)}`, meetingId, text, assigneeId, anchorMs }],
          }));
        });
      },
      addHighlight: (h) => {
        void persist(h.meetingId, { op: "highlight.add", id: h.id, categoryKey: h.categoryKey, startMs: h.startMs, endMs: h.endMs, title: h.title, note: h.note ?? null }).then((ok) => {
          if (ok) { router.refresh(); return; }
          patch((s) => ({ ...s, addedHighlights: [...s.addedHighlights, h] }));
        });
      },
      removeHighlight: (id, meetingId) => {
        patch((s) => ({
          ...s,
          removedHighlightIds: [...s.removedHighlightIds, id],
          addedHighlights: s.addedHighlights.filter((h) => h.id !== id),
        }));
        void persist(meetingId, { op: "highlight.remove", id }).then((ok) => {
          if (!ok) return;
          patch((s) => ({ ...s, removedHighlightIds: s.removedHighlightIds.filter((x) => x !== id) }));
          router.refresh();
        });
      },
      fixSpeaker: (meetingId, segmentId, toSpeakerId) => {
        void persist(meetingId, { op: "speaker.fix", segmentIds: [segmentId], toPersonId: toSpeakerId }).then((ok) => {
          if (ok) { router.refresh(); return; }
          patch((s) => {
            const existing = (s.speakerFixes[meetingId] ?? []).filter((f) => f.segmentId !== segmentId);
            return { ...s, speakerFixes: { ...s.speakerFixes, [meetingId]: [...existing, { segmentId, toSpeakerId }] } };
          });
        });
      },
      fixSpeakerEverywhere: (meetingId, _from, toSpeakerId, segmentIds) => {
        void persist(meetingId, { op: "speaker.fix", segmentIds, toPersonId: toSpeakerId }).then((ok) => {
          if (ok) { router.refresh(); return; }
          patch((s) => {
            const set = new Set(segmentIds);
            const kept = (s.speakerFixes[meetingId] ?? []).filter((f) => !set.has(f.segmentId));
            return { ...s, speakerFixes: { ...s.speakerFixes, [meetingId]: [...kept, ...segmentIds.map((segmentId) => ({ segmentId, toSpeakerId }))] } };
          });
        });
      },
      undoSpeakerFixes: (meetingId) =>
        patch((s) => {
          const next = { ...s.speakerFixes };
          delete next[meetingId];
          return { ...s, speakerFixes: next };
        }),
      upsertThread: (thread) =>
        patch((s) => ({
          ...s,
          threads: [thread, ...s.threads.filter((t) => t.id !== thread.id)],
        })),
      deleteThread: (id) =>
        patch((s) => ({ ...s, threads: s.threads.filter((t) => t.id !== id) })),
      chooseTemplate: (meetingId, key) =>
        patch((s) => ({
          ...s,
          templateChoice: { ...s.templateChoice, [meetingId]: key },
        })),
      setCaptureChoice: (upcomingId, mode) =>
        patch((s) => ({
          ...s,
          captureChoice: { ...s.captureChoice, [upcomingId]: mode },
        })),
      setTheme: (theme) => patch((s) => ({ ...s, theme })),
      setAskOpen: (askOpen) => patch((s) => ({ ...s, askOpen })),
      reset: () => setState(EMPTY),
    };
  }, [state, ready, router]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useOverlay(): OverlayApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOverlay outside OverlayProvider");
  return v;
}

/** Resolve the effective speaker for a segment, applying any correction. */
export function useSpeakerResolver(meetingId: string) {
  const { state } = useOverlay();
  return useCallback(
    (segmentId: string, original: string) => {
      const fixes = state.speakerFixes[meetingId];
      if (!fixes) return original;
      return fixes.find((f) => f.segmentId === segmentId)?.toSpeakerId ?? original;
    },
    [state.speakerFixes, meetingId],
  );
}
