"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { Icon, type IconName } from "./ui";
import { AskDock } from "./ask-dock";

// App shell: a rail, a page, and a dock.
//
// Fathom is a top bar with five tabs. Every admin template is a left sidebar
// with a logo and a list. This is neither. A 64px icon rail on the left holds
// the five places you can go and the one thing you can do (record); the page
// takes the middle; and on the right, Ask — the product's strongest feature —
// lives in a dock you can open from any page and that keeps its answer while
// you navigate. Asking a question should not mean leaving where you are.

export interface ShellUser {
  name: string;
  email: string;
  image: string | null;
}

const NAV: { href: string; label: string; icon: IconName; key: string }[] = [
  { href: "/", label: "Calls", icon: "home", key: "1" },
  { href: "/search", label: "Search", icon: "search", key: "2" },
  { href: "/commitments", label: "Commitments", icon: "shield", key: "3" },
  { href: "/actions", label: "Action items", icon: "check", key: "4" },
  { href: "/clips", label: "Clips", icon: "clip", key: "5" },
];

export function Shell({ children, user, signOut }: { children: React.ReactNode; user: ShellUser | null; signOut?: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/s/") || pathname === "/privacy" || pathname === "/terms" || !user) return <>{children}</>;
  return <Frame pathname={pathname} user={user} signOut={signOut}>{children}</Frame>;
}

function Frame({ children, pathname, user, signOut }: { children: React.ReactNode; pathname: string; user: ShellUser; signOut?: React.ReactNode }) {
  const { state, setTheme, setAskOpen } = useOverlay();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const askOpen = state.askOpen ?? false;

  // Keyboard: "/" to search, "?" to open Ask, 1–5 to move around.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); router.push("/search"); }
      if (e.key === "?") { e.preventDefault(); setAskOpen(!askOpen); }
      const n = NAV.find((x) => x.key === e.key);
      if (n) router.push(n.href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, askOpen, setAskOpen]);

  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/m/") : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ---- rail ---- */}
      <aside
        className="sticky top-0 z-40 hidden h-screen w-[64px] shrink-0 flex-col items-center py-3 md:flex"
        style={{ background: "var(--bg-sunken)", borderRight: "1px solid var(--line)" }}
        aria-label="Main"
      >
        <Link href="/" className="mb-3 grid h-10 w-10 place-items-center rounded-[12px]" title="Fathom Rebuild" style={{ color: "var(--ink)" }}>
          <Mark />
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {NAV.map((n) => {
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                title={`${n.label}  ·  ${n.key}`}
                className="group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors duration-200"
                style={{ color: on ? "var(--ink)" : "var(--ink-3)", background: on ? "var(--surface-2)" : "transparent" }}
              >
                <Icon name={n.icon} size={19} />
                <span
                  className="pointer-events-none absolute left-full ml-2 rounded-[7px] px-2 py-1 text-[12px] font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "var(--ink)", color: "var(--bg)" }}
                >
                  {n.label}
                </span>
                {on && <span className="absolute top-1/2 -left-[13px] h-5 w-[3px] -translate-y-1/2 rounded-r-full" style={{ background: "var(--accent)" }} />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={() => setAskOpen(!askOpen)}
            title="Ask the workspace  ·  ?"
            aria-pressed={askOpen}
            className="grid h-11 w-11 place-items-center rounded-[12px] transition-colors"
            style={{ color: askOpen ? "var(--on-accent)" : "var(--ink-3)", background: askOpen ? "var(--accent)" : "var(--surface-2)" }}
          >
            <Icon name="sparkle" size={18} />
          </button>

          <Link
            href="/record"
            title="Record a meeting"
            className="grid h-11 w-11 place-items-center rounded-full transition-transform duration-200 hover:scale-[1.06]"
            style={{ background: "var(--danger)", color: "oklch(100% 0 0)", boxShadow: "0 4px 18px color-mix(in oklab, var(--danger) 40%, transparent)" }}
          >
            <span className="block h-3.5 w-3.5 rounded-full" style={{ background: "currentColor" }} />
          </Link>

          <div className="relative mt-1">
            <button
              onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menu}
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full text-[12px] font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-strong)" }}
              title={user.name}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initialsOf(user.name)
              )}
            </button>
            {menu && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} tabIndex={-1} aria-label="Close menu" />
                <div role="menu" className="absolute bottom-0 left-full z-50 ml-3 w-[240px] overflow-hidden rounded-[var(--radius)] p-1" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}>
                  <div className="px-2.5 py-2" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{user.name || user.email}</div>
                    <div className="truncate text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{user.email}</div>
                  </div>
                  <MenuLink href="/live" label="Replay a call live" icon="live" onGo={() => setMenu(false)} />
                  <MenuLink href="/import" label="Import a transcript" icon="plus" onGo={() => setMenu(false)} />
                  <MenuLink href="/upload" label="Upload a recording" icon="download" onGo={() => setMenu(false)} />
                  <MenuLink href="/about" label="How it works" icon="shield" onGo={() => setMenu(false)} />
                  <button
                    onClick={() => { setTheme(state.theme === "dark" ? "light" : "dark"); setMenu(false); }}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px]"
                    style={{ color: "var(--ink-2)" }}
                  >
                    <span style={{ color: "var(--ink-3)" }}><Icon name={state.theme === "dark" ? "sun" : "moon"} size={14} /></span>
                    {state.theme === "dark" ? "Light theme" : "Dark theme"}
                  </button>
                  {signOut && <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--line)" }}>{signOut}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ---- page ---- */}
      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

      {/* ---- dock ---- */}
      <AskDock open={askOpen} onClose={() => setAskOpen(false)} />

      {/* ---- mobile bar ---- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around px-2 py-1.5 md:hidden"
        style={{ background: "color-mix(in oklab, var(--bg-sunken) 92%, transparent)", borderTop: "1px solid var(--line)", backdropFilter: "blur(10px)" }}
        aria-label="Main"
      >
        {NAV.slice(0, 4).map((n) => {
          const on = active(n.href);
          return (
            <Link key={n.href} href={n.href} className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: on ? "var(--ink)" : "var(--ink-3)" }} title={n.label}>
              <Icon name={n.icon} size={19} />
            </Link>
          );
        })}
        <button onClick={() => setAskOpen(!askOpen)} className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: askOpen ? "var(--accent)" : "var(--ink-3)" }} title="Ask">
          <Icon name="sparkle" size={19} />
        </button>
        <Link href="/record" className="grid h-10 w-10 place-items-center rounded-full" style={{ background: "var(--danger)", color: "#fff" }} title="Record">
          <span className="block h-3 w-3 rounded-full" style={{ background: "currentColor" }} />
        </Link>
      </nav>
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function MenuLink({ href, label, icon, onGo }: { href: string; label: string; icon: IconName; onGo: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onGo} className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px]" style={{ color: "var(--ink-2)" }}>
      <span style={{ color: "var(--ink-3)" }}><Icon name={icon} size={14} /></span>
      {label}
    </Link>
  );
}

export function Mark({ size = 24 }: { size?: number }) {
  // A recording dot inside two rings, so the mark is literally the thing the
  // product does. Drawn, not a font glyph.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="2.6" fill="var(--danger)" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".7" />
      <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".28" />
    </svg>
  );
}
