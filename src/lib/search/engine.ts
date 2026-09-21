import type { SearchHit, Segment } from "@/lib/types";

// ---------------------------------------------------------------------------
// Hybrid search
//
// Fathom's search is two systems bolted together and ranked separately:
// keyword results first, then a "Find <query> with AI" affordance that drops
// semantic results *below* them. That ordering is backwards — it makes the
// better retriever the one you have to opt into — and it is the thing the
// rebuild inverts.
//
// Here there is one ranked list. Two scorers run over every candidate and the
// scores are blended:
//
//   LEXICAL   BM25 over the transcript. Exact terms, properly weighted for
//             document length and term rarity.
//   SEMANTIC  Cosine similarity in TF-IDF space, with query expansion over a
//             curated concept map.
//
// HONEST LIMITATION, stated here and in the README rather than buried: the
// "semantic" half is sparse-vector retrieval with synonym expansion, not a
// neural embedding model. It catches the vocabulary-mismatch case that Fathom
// reviewers complain about ("churn risk" vs "cancellation likelihood") because
// that is what the concept map encodes. It will not catch a genuine paraphrase
// with no shared vocabulary. Swapping in real embeddings is an interface
// change to `semanticScores`, nothing more — but I am not going to call a
// synonym table an embedding model.
// ---------------------------------------------------------------------------

const STOP = new Set(
  ("a an and are as at be but by for from has have he her his i if in is it its of on or " +
    "our she that the their them then there these they this to was we were what when which " +
    "who will with you your do does did so just really actually going get got like " +
    "think know yeah okay right sure mean thing things one two")
    .split(" "),
);

/**
 * Concept map for query expansion. Each row is a cluster of terms that mean
 * roughly the same thing in this product's domain. A query term expands to its
 * cluster at a discounted weight, which is what lets "churn" find
 * "cancellation" and "renewal risk".
 *
 * Hand-curated on purpose: a wrong synonym is worse than a missing one, and at
 * this corpus size precision matters more than coverage.
 */
const CONCEPTS: string[][] = [
  ["churn", "cancel", "cancellation", "renew", "renewal", "attrition", "leave", "switch", "migration"],
  ["latency", "slow", "p99", "performance", "speed", "milliseconds", "fast"],
  ["connector", "integration", "sync", "ingest", "pipeline", "source"],
  ["search", "relevance", "retrieval", "query", "ranking", "results"],
  ["navigation", "nav", "menu", "findability", "ia", "discoverability", "layout"],
  ["ticket", "support", "escalation", "complaint", "issue", "bug"],
  ["deadline", "date", "timeline", "december", "january", "quarter", "q4", "schedule"],
  ["price", "pricing", "discount", "budget", "cost", "contract", "packaging", "tier"],
  ["security", "soc", "compliance", "questionnaire", "pentest", "audit", "review"],
  ["hire", "candidate", "interview", "offer", "role"],
  ["oncall", "page", "paged", "incident", "outage", "alert", "rotation"],
  ["decision", "decided", "agreed", "commit", "threshold", "criteria"],
  ["risk", "blocker", "concern", "worry", "problem", "danger"],
  ["capacity", "headcount", "staffing", "engineers", "resourcing", "people"],
  ["measure", "measurement", "metric", "evaluation", "eval", "harness", "benchmark"],
  ["trust", "confidence", "reliable", "reliability", "unreliable"],
];

const EXPANSION = (() => {
  const m = new Map<string, Set<string>>();
  for (const cluster of CONCEPTS) {
    for (const term of cluster) {
      const set = m.get(term) ?? new Set<string>();
      for (const other of cluster) if (other !== term) set.add(other);
      m.set(term, set);
    }
  }
  return m;
})();

/** Light stemmer. Not Porter — just the suffixes that actually matter here. */
function stem(w: string): string {
  if (w.length <= 3) return w;
  for (const suf of ["ingly", "edly", "ing", "ers", "ies", "ed", "es", "s", "ly"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      const base = w.slice(0, -suf.length);
      return suf === "ies" ? base + "y" : base;
    }
  }
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

interface Doc {
  segmentId: string;
  meetingId: string;
  speakerId: string;
  anchorMs: number;
  text: string;
  source: "transcript" | "summary";
  tokens: string[];
  tf: Map<string, number>;
  len: number;
}

export interface Index {
  docs: Doc[];
  df: Map<string, number>;
  avgLen: number;
  n: number;
}

export function buildIndex(
  segments: Segment[],
  summaryDocs: {
    segmentId: string;
    meetingId: string;
    anchorMs: number;
    text: string;
    speakerId: string;
  }[] = [],
): Index {
  const docs: Doc[] = [];

  const push = (d: Omit<Doc, "tokens" | "tf" | "len">) => {
    const tokens = tokenize(d.text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    docs.push({ ...d, tokens, tf, len: tokens.length });
  };

  for (const s of segments) {
    // Back-channel ("Yeah.", "Mm-hm.") is noise in a search index and pollutes
    // results with meaningless hits. Two tokens is the cutoff.
    if (tokenize(s.text).length < 3) continue;
    push({
      segmentId: s.id,
      meetingId: s.meetingId,
      speakerId: s.speakerId,
      anchorMs: s.startMs,
      text: s.text,
      source: "transcript",
    });
  }
  for (const d of summaryDocs) {
    push({ ...d, source: "summary" });
  }

  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }

  return {
    docs,
    df,
    avgLen: docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length),
    n: docs.length,
  };
}

const K1 = 1.4;
const B = 0.72;

function idf(index: Index, term: string): number {
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
}

/** Expand a query into weighted terms: originals at 1.0, concept siblings at 0.45. */
export function expandQuery(q: string): Map<string, number> {
  const base = tokenize(q);
  const out = new Map<string, number>();
  for (const t of base) out.set(t, Math.max(out.get(t) ?? 0, 1));
  for (const t of base) {
    for (const sib of EXPANSION.get(t) ?? []) {
      const st = stem(sib);
      if (!out.has(st)) out.set(st, 0.45);
    }
  }
  return out;
}

function bm25(index: Index, doc: Doc, terms: Map<string, number>): number {
  let score = 0;
  for (const [term, weight] of terms) {
    const f = doc.tf.get(term);
    if (!f) continue;
    const norm = f * (K1 + 1) /
      (f + K1 * (1 - B + B * (doc.len / Math.max(1, index.avgLen))));
    score += weight * idf(index, term) * norm;
  }
  return score;
}

/** Cosine similarity between the expanded query and the doc, in TF-IDF space. */
function cosine(index: Index, doc: Doc, terms: Map<string, number>): number {
  let dot = 0;
  let qNorm = 0;
  let dNorm = 0;
  for (const [term, weight] of terms) {
    const w = weight * idf(index, term);
    qNorm += w * w;
    const f = doc.tf.get(term);
    if (f) dot += w * (1 + Math.log(f)) * idf(index, term);
  }
  for (const [term, f] of doc.tf) {
    const w = (1 + Math.log(f)) * idf(index, term);
    dNorm += w * w;
  }
  if (!dot) return 0;
  return dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm) || 1);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

/** Highlight matched terms, including expansion hits so the user sees WHY it matched. */
function markup(text: string, terms: Map<string, number>): string {
  const parts = text.split(/(\s+)/);
  return parts
    .map((part) => {
      const bare = part.toLowerCase().replace(/[^a-z0-9'-]/g, "");
      if (!bare) return escapeHtml(part);
      const st = stem(bare);
      const weight = terms.get(st);
      if (weight == null) return escapeHtml(part);
      const cls = weight >= 1 ? "hit" : "hit hit-expanded";
      return `<mark class="${cls}">${escapeHtml(part)}</mark>`;
    })
    .join("");
}

export interface SearchOptions {
  /** 0 = pure lexical, 1 = pure semantic. 0.35 favours precision with recall insurance. */
  alpha?: number;
  limit?: number;
  meetingIds?: Set<string>;
  speakerIds?: Set<string>;
  source?: "all" | "transcript" | "summary";
}

export function search(
  index: Index,
  query: string,
  meta: Map<string, { title: string; startedAt: string }>,
  opts: SearchOptions = {},
): SearchHit[] {
  const { alpha = 0.35, limit = 60, meetingIds, speakerIds, source = "all" } = opts;
  const terms = expandQuery(query);
  if (!terms.size) return [];

  const scored: SearchHit[] = [];
  let maxLex = 0;
  let maxSem = 0;
  const raw: { doc: Doc; lex: number; sem: number }[] = [];

  for (const doc of index.docs) {
    if (meetingIds && !meetingIds.has(doc.meetingId)) continue;
    if (speakerIds && !speakerIds.has(doc.speakerId)) continue;
    if (source !== "all" && doc.source !== source) continue;
    const lex = bm25(index, doc, terms);
    const sem = cosine(index, doc, terms);
    if (lex <= 0 && sem <= 0.02) continue;
    maxLex = Math.max(maxLex, lex);
    maxSem = Math.max(maxSem, sem);
    raw.push({ doc, lex, sem });
  }

  for (const { doc, lex, sem } of raw) {
    // Normalise each scorer to 0..1 before blending, otherwise BM25's unbounded
    // range swamps cosine and alpha stops meaning anything.
    const nLex = maxLex ? lex / maxLex : 0;
    const nSem = maxSem ? sem / maxSem : 0;
    // Summary hits get a small lift: a bullet is an editorial claim about the
    // call, so matching one is usually a better answer than matching a stray
    // sentence that happens to contain the word.
    const sourceBoost = doc.source === "summary" ? 1.12 : 1;
    const m = meta.get(doc.meetingId);
    scored.push({
      meetingId: doc.meetingId,
      meetingTitle: m?.title ?? doc.meetingId,
      startedAt: m?.startedAt ?? "",
      segmentId: doc.segmentId,
      anchorMs: doc.anchorMs,
      speakerId: doc.speakerId,
      html: markup(doc.text, terms),
      plain: doc.text,
      lexical: Math.round(nLex * 1000) / 1000,
      semantic: Math.round(nSem * 1000) / 1000,
      score: Math.round(((1 - alpha) * nLex + alpha * nSem) * sourceBoost * 1000) / 1000,
      source: doc.source,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
