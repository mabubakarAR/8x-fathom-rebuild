"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useOverlay } from "@/lib/overlay";
import { Icon, type IconName } from "./ui";
import { AskDock } from "./ask-dock";

// App shell: a sidebar, a page, and a dock.
//
// The sidebar has two widths. Expanded (default) it is a normal labelled
// sidebar — five places to go, one thing to do, settings, you. Collapsed it
// is a 64px icon rail for people who know where things are and want the
// room. The choice is remembered. On the right, Ask lives in a dock that
// opens from any page and keeps its answer while you click through to the
// moments it cites.

export interface ShellUser {
  name: string;
  email: string;
  image: string | null;
}

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Meetings", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/commitments", label: "Commitments", icon: "shield" },
  { href: "/actions", label: "Action items", icon: "check" },
  { href: "/clips", label: "Clips", icon: "clip" },
];

const BARE = ["/s/", "/privacy", "/terms"];
// /about is public: signed out it renders bare (the !user branch below).

export function Shell({ children, user, signOut }: { children: React.ReactNode; user: ShellUser | null; signOut?: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (BARE.some((p) => pathname.startsWith(p)) || !user) return <>{children}</>;
  return <Frame pathname={pathname} user={user} signOut={signOut}>{children}</Frame>;
}

function Frame({ children, pathname, user, signOut }: { children: React.ReactNode; pathname: string; user: ShellUser; signOut?: React.ReactNode }) {
  const { state, setAskOpen, setRailOpen, ready } = useOverlay();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const askOpen = state.askOpen ?? false;
  // Expanded by default; the stored choice wins once localStorage is read.
  const open = ready ? state.railOpen !== false : true;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); router.push("/search"); }
      if (e.key === "?") { e.preventDefault(); setAskOpen(!askOpen); }
      if (e.key === "[") { e.preventDefault(); setRailOpen(!open); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, askOpen, open, setAskOpen, setRailOpen]);

  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/m/") : pathname.startsWith(href));
  const W = open ? 228 : 64;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ---- sidebar ---- */}
      <aside
        className="sticky top-0 z-40 hidden h-screen shrink-0 flex-col py-3 transition-[width] duration-300 md:flex"
        style={{ width: W, background: "var(--bg-sunken)", borderRight: "1px solid var(--line)", transitionTimingFunction: "var(--ease)" }}
        aria-label="Main"
      >
        <div className={`mb-3 flex items-center ${open ? "justify-between px-3" : "justify-center"}`}>
          <Link href="/" className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5" title="Noted" style={{ color: "var(--ink)" }}>
            <Mark size={22} />
            {open && <span className="text-[15px] font-semibold tracking-[-0.02em]">Noted</span>}
          </Link>
          {open && (
            <button onClick={() => setRailOpen(false)} className="grid h-8 w-8 place-items-center rounded-[8px]" style={{ color: "var(--ink-3)" }} title="Collapse  ·  [" aria-label="Collapse sidebar">
              <Icon name="back" size={15} />
            </button>
          )}
        </div>
        {!open && (
          <button onClick={() => setRailOpen(true)} className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-[8px]" style={{ color: "var(--ink-3)" }} title="Expand  ·  [" aria-label="Expand sidebar">
            <Icon name="chevron" size={15} />
          </button>
        )}

        <nav className={`flex flex-col gap-0.5 ${open ? "px-2" : "items-center"}`}>
          {NAV.map((n) => {
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                title={open ? undefined : n.label}
                className={`group relative flex items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors duration-150 ${open ? "px-3 py-2" : "h-11 w-11 justify-center"}`}
                style={{ color: on ? "var(--ink)" : "var(--ink-2)", background: on ? "var(--surface)" : "transparent", boxShadow: on ? "var(--shadow-sm)" : undefined }}
              >
                <span style={{ color: on ? "var(--accent)" : "var(--ink-3)" }}><Icon name={n.icon} size={18} /></span>
                {open && <span className="flex-1">{n.label}</span>}
                {!open && (
                  <span className="pointer-events-none absolute left-full z-50 ml-2 rounded-[7px] px-2 py-1 text-[12px] font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100" style={{ background: "var(--ink)", color: "var(--bg)" }}>
                    {n.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto flex flex-col gap-1 ${open ? "px-2" : "items-center"}`}>
          <button
            onClick={() => setAskOpen(!askOpen)}
            title={open ? undefined : "Ask  ·  ?"}
            aria-pressed={askOpen}
            className={`flex items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors ${open ? "px-3 py-2" : "h-11 w-11 justify-center"}`}
            style={{ color: askOpen ? "var(--on-accent)" : "var(--ink-2)", background: askOpen ? "var(--accent)" : "var(--surface-2)" }}
          >
            <Icon name="sparkle" size={17} />
            {open && <span className="flex-1 text-left">Ask</span>}
            {open && <kbd className="text-[10.5px]" style={{ color: askOpen ? "var(--on-accent)" : "var(--ink-faint)" }}>?</kbd>}
          </button>

          <Link
            href="/record"
            title={open ? undefined : "Record a meeting"}
            className={`flex items-center gap-3 rounded-[10px] text-[13.5px] font-semibold transition-transform duration-200 hover:scale-[1.02] ${open ? "px-3 py-2" : "h-11 w-11 justify-center rounded-full"}`}
            style={{ background: "var(--danger)", color: "#fff", boxShadow: "0 4px 18px color-mix(in oklab, var(--danger) 36%, transparent)" }}
          >
            <span className="block h-3 w-3 shrink-0 rounded-full" style={{ background: "currentColor" }} />
            {open && <span>Record</span>}
          </Link>

          <Link
            href="/settings"
            title={open ? undefined : "Settings"}
            className={`flex items-center gap-3 rounded-[10px] text-[13.5px] font-medium ${open ? "px-3 py-2" : "h-11 w-11 justify-center"}`}
            style={{ color: pathname.startsWith("/settings") ? "var(--ink)" : "var(--ink-2)", background: pathname.startsWith("/settings") ? "var(--surface)" : "transparent" }}
          >
            <span style={{ color: "var(--ink-3)" }}><Icon name="filter" size={17} /></span>
            {open && <span>Settings</span>}
          </Link>

          <div className="relative mt-1">
            <button
              onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menu}
              className={`flex w-full items-center gap-3 rounded-[10px] ${open ? "px-2 py-1.5" : "justify-center"}`}
              title={user.name}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-[12px] font-semibold" style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line-strong)" }}>
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  initialsOf(user.name)
                )}
              </span>
              {open && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>{user.name || user.email}</span>
                  <span className="block truncate text-[11px]" style={{ color: "var(--ink-faint)" }}>{user.email}</span>
                </span>
              )}
            </button>
            {menu && (
              <>
                <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} tabIndex={-1} aria-label="Close menu" />
                <div role="menu" className="absolute bottom-0 left-full z-50 ml-3 w-[220px] overflow-hidden rounded-[var(--radius)] p-1" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}>
                  <MenuLink href="/live" label="Replay a call live" icon="live" onGo={() => setMenu(false)} />
                  <MenuLink href="/import" label="Import a transcript" icon="plus" onGo={() => setMenu(false)} />
                  <MenuLink href="/upload" label="Upload a recording" icon="download" onGo={() => setMenu(false)} />
                  <MenuLink href="/about" label="How it works" icon="shield" onGo={() => setMenu(false)} />
                  {signOut && <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--line)" }}>{signOut}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

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
            <Link key={n.href} href={n.href} className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ color: on ? "var(--accent)" : "var(--ink-3)" }} title={n.label}>
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
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="2.6" fill="var(--danger)" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".7" />
      <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".28" />
    </svg>
  );
}
