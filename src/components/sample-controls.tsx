"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Import or remove the sample workspace. One button each; the server does the
// rest and the page re-renders from the database.

export function SampleControls({ variant = "remove" }: { variant?: "import" | "remove" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(method: "POST" | "DELETE") {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/workspace/sample", { method });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.reason || j.error || "Failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "import") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={() => run("POST")}
          disabled={busy}
          className="rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-semibold disabled:opacity-60"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {busy ? "Importing nine meetings…" : "Import the sample workspace"}
        </button>
        {err && <span className="text-[12px]" style={{ color: "var(--danger)" }}>{err}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {err && <span className="text-[12px]" style={{ color: "var(--danger)" }}>{err}</span>}
      <button onClick={() => run("DELETE")} disabled={busy} className="text-[12.5px] font-medium underline disabled:opacity-60" style={{ color: "var(--ink-3)" }}>
        {busy ? "Removing…" : "Remove sample"}
      </button>
    </div>
  );
}
