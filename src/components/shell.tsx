"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { Icon, type IconName } from "./ui";

// App shell.
//
// Five top-level destinations, not nine — the navigation collapse is one of the
// things the rebuild's own seed data argues for, so shipping a nine-item nav
// while the roadmap meeting complains about nine-item navs would be funny in
// the wrong way.
//
// Share pages render outside the shell entirely: a signed-out stranger opening
// a clip link should not see somebody else's workspace navigation.

const NAV: { href: string; label: string; icon: IconName; key: string }[] = [
  { href: "/", label: "Meetings", icon: "home", key: "m" },
  { href: "/search", label: "Search", icon: "search", key: "/" },
  { href: "/actions", label: "Action items", icon: "check", key: "a" },
  { href: "/clips", label: "Clips", icon: "clip", key: "c" },
  { href: "/live", label: "Live", icon: "live", key: "l" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShare = pathname?.startsWith("/s/");

  if (isShare) return <>{children}</>;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar pathname={pathname ?? "/"} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { state, setTheme } = useOverlay();
  const [open, setOpen] = useState(false);

  // Keyboard navigation. The accessibility complaints in Fathom's reviews are
  // real and this is the cheap half of answering them.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      const hit = NAV.find((n) => n.key === e.key.toLowerCase());
      if (hit) {
        e.preventDefault();
        window.location.assign(hit.href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nextTheme = state.theme === "dark" ? "light" : "dark";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed top-3 left-3 z-50 grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] md:hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        <Icon name={open ? "close" : "list"} />
      </button>

      <nav
        aria-label="Main"
        className={`fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--bg-sunken)", borderRight: "1px solid var(--line)" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 pt-5 pb-5"
          style={{ color: "var(--ink)" }}
        >
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Fathom Rebuild</span>
        </Link>

        <ul className="flex flex-col gap-0.5 px-2.5">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[13.5px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-2)",
                    boxShadow: active ? "var(--shadow-sm)" : undefined,
                  }}
                >
                  <span style={{ color: active ? "var(--accent)" : "var(--ink-3)" }}>
                    <Icon name={item.icon} />
                  </span>
                  {item.label}
                  <kbd
                    className="ml-auto hidden rounded px-1 text-[10px] font-medium group-hover:block"
                    style={{ background: "var(--surface-2)", color: "var(--ink-faint)" }}
                  >
                    {item.key}
                  </kbd>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex flex-col gap-2 p-3">
          <button
            onClick={() => setTheme(nextTheme)}
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-[7px] text-[13px] font-medium"
            style={{ color: "var(--ink-2)" }}
          >
            <span style={{ color: "var(--ink-3)" }}>
              <Icon name={state.theme === "dark" ? "sun" : "moon"} />
            </span>
            {state.theme === "dark" ? "Light" : "Dark"}
          </button>
          <div
            className="rounded-[var(--radius-sm)] px-2.5 py-2 text-[11px] leading-[1.45]"
            style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}
          >
            Demo workspace — Lumen Labs. Capture is simulated;{" "}
            <Link href="/about" className="underline" style={{ color: "var(--accent-ink)" }}>
              what&rsquo;s real
            </Link>
            .
          </div>
        </div>
      </nav>

      {open && (
        <button
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "oklch(0% 0 0 / .35)" }}
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          tabIndex={-1}
        />
      )}
    </>
  );
}

/** Mark — concentric sweep, nodding at Fathom's depth-sounding metaphor. */
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="2.4" fill="var(--accent)" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="var(--accent)" strokeWidth="1.7" opacity=".6" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="1.7" opacity=".26" />
    </svg>
  );
}
