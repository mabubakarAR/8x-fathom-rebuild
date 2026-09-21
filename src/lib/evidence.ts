// The evidence ledger — shared types.
//
// These live outside the pipeline module on purpose: the pipeline is
// `server-only`, and the whole point of the ledger is that it travels to the
// browser and gets shown to the person reading the summary.
//
// The claim this product makes is "every bullet is anchored to a real line".
// The ledger is what turns that from marketing into something you can audit
// in the UI: how many claims the model proposed, how many survived validation,
// and — verbatim — the ones that did not.

/** One claim the model made that could not be anchored to a real line. */
export interface DroppedClaim {
  kind: "chapter" | "bullet" | "action" | "highlight";
  /** The section or list it would have appeared in. */
  where: string;
  text: string;
  /** What the model actually cited, however nonsensical. */
  citedIdx: number | null;
  reason: string;
}

export interface EvidenceLedger {
  model: string;
  segmentCount: number;
  maxIdx: number;
  proposed: number;
  resolved: number;
  dropped: DroppedClaim[];
  elapsedMs: number;
}

export interface AskEvidence {
  /** How many lines retrieval put in front of the model. */
  considered: number;
  /** How many citations the model claimed. */
  proposed: number;
  /** How many of those resolved to a line it was actually shown. */
  resolved: number;
  dropped: { citedIdx: number; reason: string }[];
  elapsedMs: number;
}
