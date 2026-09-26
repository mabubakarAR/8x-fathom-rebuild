import Link from "next/link";
import { SampleControls } from "./sample-controls";
import { Icon } from "./ui";

// What sits above the list for a signed-in user.
//
// When the workspace is empty this is the whole page, and it has one job: get
// a first meeting in. Three ways, in the order they should be tried — record
// a real one, bring a transcript, or import the sample so the rest of the
// product has something to work with.

export function WorkspaceHero({ empty, name }: { empty: boolean; name: string }) {
  const first = name.split(" ")[0] || "there";
  if (!empty) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <Link href="/record" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-semibold" style={{ background: "var(--danger)", color: "oklch(100% 0 0)" }}>
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
          Record a meeting
        </Link>
        <Link href="/import" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-medium" style={{ background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line-strong)" }}>
          <Icon name="plus" size={14} /> Bring a transcript
        </Link>
        <Link href="/upload" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[10px] text-[13.5px] font-medium" style={{ background: "transparent", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
          <Icon name="download" size={14} /> Upload a recording
        </Link>
      </div>
    );
  }
  return (
    <div className="mb-8 rounded-[var(--radius-lg)] p-6 raised" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>
        Hi {first}. Nothing here yet.
      </h1>
      <p className="mt-1.5 max-w-[60ch] text-[14px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
        Your upcoming calendar is above. When one of those meetings starts, join it from here and it gets recorded. Or start with something now:
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link href="/record" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[11px] text-[13.5px] font-semibold" style={{ background: "var(--danger)", color: "oklch(100% 0 0)" }}>
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
          Record a meeting
        </Link>
        <Link href="/import" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-[11px] text-[13.5px] font-medium" style={{ color: "var(--ink-2)", border: "1px solid var(--line-strong)" }}>
          <Icon name="plus" size={14} /> Bring a transcript
        </Link>
        <span className="mx-1 hidden h-6 w-px sm:block" style={{ background: "var(--line)" }} />
        <SampleControls variant="import" />
      </div>
      <p className="mt-3 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        The sample is nine authored meetings from one team&rsquo;s quarter — enough to search across, ask questions of, and catch a decision that got reversed. It imports into your account and can be removed in one click.
      </p>
    </div>
  );
}
