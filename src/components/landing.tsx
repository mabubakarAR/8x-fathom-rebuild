import { SignInButton } from "./sign-in-button";

// Placeholder front door — replaced by the real landing page in the design
// pass. It exists so a signed-out visitor never sees a workspace.
export function Landing() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[720px] flex-col items-start justify-center px-6">
      <h1 className="text-[36px] font-semibold tracking-[-0.03em]" style={{ color: "var(--ink)" }}>Fathom Rebuild</h1>
      <p className="mt-3 text-[16px] leading-[1.5]" style={{ color: "var(--ink-3)" }}>
        Meeting notes where every claim points at the line it came from.
      </p>
      <SignInButton className="mt-6 inline-flex items-center rounded-[var(--radius-sm)] px-4 py-[11px] text-[14px] font-semibold" style={{ background: "var(--ink)", color: "var(--bg)" }} />
    </main>
  );
}
