import Link from "next/link";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[680px] px-6 pt-14 pb-24" style={{ color: "var(--ink-2)" }}>
      <Link href="/" className="text-[12.5px] font-medium" style={{ color: "var(--ink-3)" }}>← Noted</Link>
      <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>{title}</h1>
      <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>Last updated {updated}</p>
      <div className="legal mt-8 flex flex-col gap-4 text-[14.5px] leading-[1.65]">{children}</div>
      <style>{`.legal h2{margin-top:.75rem;font-size:15px;font-weight:600;color:var(--ink)}`}</style>
    </main>
  );
}
