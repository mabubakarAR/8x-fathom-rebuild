"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { Icon, type IconName } from "./ui";

// App shell.
//
// This was a left sidebar, which is the shape of every admin template ever
// shipped. Fathom uses a top bar — wordmark, one global search field, a row
// of tabs, an avatar — and the difference is not cosmetic: the search field
// being *in the chrome* rather than on a search page is what tells you the
// product is a library of recordings you look things up in.
//
// Share pages render outside the shell entirely: a signed-out stranger
// opening a clip link should not see somebody else's workspace navigation.

const NAV: { href: string; label: string; key: string }[] = [
  { href: "/", label: "My Calls", key: "1" },
  { href: "/actions", label: "Action Items", key: "2" },
  { href: "/clips", label: "Playlists", key: "3" },
  { href: "/live", label: "Live Demo", key: "4" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/s/")) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <TopBar pathname={pathname} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TopBar({ pathname }: { pathname: string }) {
  const { state, setTheme } = useOverlay();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, which is the shortcut people already
  // have in their fingers from every other tool.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape" && el === search.current) search.current?.blur();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "var(--bg-sunken)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="mx-auto flex w-full max-w-[1480px] items-center gap-3 px-4 py-2.5 md:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-2" style={{ color: "var(--ink)" }}>
          <Mark />
          <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
            Fathom Rebuild
          </span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
          className="mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius)] px-3"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <span style={{ color: "var(--ink-faint)" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            ref={search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search call recordings"
            aria-label="Search call recordings"
            className="w-full bg-transparent py-[7px] text-[13.5px] outline-none"
            style={{ color: "var(--ink)" }}
          />
          <kbd
            className="hidden rounded px-1.5 text-[10.5px] font-medium sm:block"
            style={{ background: "var(--surface-2)", color: "var(--ink-faint)" }}
          >
            /
          </kbd>
        </form>

        <Link
          href="/record"
          className="inline-flex shrink-0 items-center gap-2 rounded-full py-[7px] pr-3.5 pl-3 text-[13px] font-semibold"
          style={{ background: "var(--danger)", color: "oklch(100% 0 0)" }}
        >
          <span className="block h-2 w-2 rounded-full" style={{ background: "currentColor" }} />
          <span className="hidden sm:inline">Record</span>
        </Link>

        <Link
          href="/import"
          className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-[7px] text-[13px] font-medium md:inline-flex"
          style={{ color: "var(--ink-2)", border: "1px solid var(--line)" }}
        >
          <Icon name="plus" size={13} /> Import
        </Link>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menu}
            className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            title="Workspace"
          >
            AM
          </button>
          {menu && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} tabIndex={-1} aria-label="Close menu" />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-[240px] overflow-hidden rounded-[var(--radius)] p-1"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
              >
                <div className="px-2.5 py-2" style={{ borderBottom: "1px solid var(--line)" }}>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                    Abubakar M
                  </div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                    Lumen Labs workspace
                  </div>
                </div>
                <MenuLink href="/settings" label="Settings" icon="filter" onGo={() => setMenu(false)} />
                <MenuLink href="/about" label="What's real vs simulated" icon="shield" onGo={() => setMenu(false)} />
                <button
                  onClick={() => {
                    setTheme(state.theme === "dark" ? "light" : "dark");
                    setMenu(false);
                  }}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px]"
                  style={{ color: "var(--ink-2)" }}
                >
                  <span style={{ color: "var(--ink-3)" }}>
                    <Icon name={state.theme === "dark" ? "sun" : "moon"} size={14} />
                  </span>
                  {state.theme === "dark" ? "Light theme" : "Dark theme"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Main" className="mx-auto w-full max-w-[1480px] px-4 md:px-7">
        <ul className="flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const on = active(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className="block px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors"
                  style={{
                    color: on ? "var(--accent)" : "var(--ink-3)",
                    boxShadow: on ? "inset 0 -2px 0 var(--accent)" : undefined,
                  }}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function MenuLink({
  href,
  label,
  icon,
  onGo,
}: {
  href: string;
  label: string;
  icon: IconName;
  onGo: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onGo}
      className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px]"
      style={{ color: "var(--ink-2)" }}
    >
      <span style={{ color: "var(--ink-3)" }}>
        <Icon name={icon} size={14} />
      </span>
      {label}
    </Link>
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
