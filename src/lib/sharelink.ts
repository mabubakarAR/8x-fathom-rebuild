// Share links carry their payload in the URL.
//
// With no database, this is what makes sharing actually cross the browser
// boundary — the whole point of "send a clip to someone who wasn't on the
// call". The recipient's browser has never seen this workspace's localStorage,
// so the link itself has to say what to show.
//
// Being explicit about what this is NOT: a URL payload is not an access
// control mechanism. The scope recorded in the link is honoured by the UI and
// would be enforced server-side in a build with accounts. For a demo where
// every meeting is public seed data, nothing sensitive is being protected.
// Stated here rather than implied.

export type ShareScope = "public" | "domain" | "invited";

export interface SharePayload {
  /** meeting id */
  m: string;
  /** clip start / end, omitted for a whole-recording link */
  s?: number;
  e?: number;
  /** clip title */
  t?: string;
  /** scope */
  sc: ShareScope;
  /** who shared it */
  by?: string;
}

function toBase64Url(s: string): string {
  const b64 = typeof window === "undefined"
    ? Buffer.from(s, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof window === "undefined"
    ? Buffer.from(b64, "base64").toString("utf8")
    : decodeURIComponent(escape(atob(b64)));
}

export function encodeShare(p: SharePayload): string {
  return toBase64Url(JSON.stringify(p));
}

export function decodeShare(token: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token));
    if (!parsed || typeof parsed.m !== "string") return null;
    if (!["public", "domain", "invited"].includes(parsed.sc)) parsed.sc = "public";
    return parsed as SharePayload;
  } catch {
    return null;
  }
}
