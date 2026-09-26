import type { Metadata } from "next";
import "./globals.css";
import { OverlayProvider } from "@/lib/overlay";
import { Shell } from "@/components/shell";
import { SignOutButton } from "@/components/sign-in-button";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Noted — AI meeting notetaker",
  description:
    "Noted records your calls without a bot in the room, then turns them into cited notes: auto-chaptered transcripts, summaries that link every claim to the line it came from, and one search across every meeting you have ever had.",
};

// Applied before paint so a dark-mode viewer never sees a white flash. Reading
// localStorage here can throw (private mode), hence the try/catch.
const THEME_BOOT = `(function(){var t="light";try{var s=localStorage.getItem("8x-fathom-rebuild.overlay.v1");if(s){var v=JSON.parse(s).theme;if(v==="light"||v==="dark")t=v;else if(v==="system")t="";}}catch(e){}if(t)document.documentElement.setAttribute("data-theme",t);})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const user = session?.user?.id
    ? {
        name: session.user.name ?? "",
        email: session.user.guest ? "Temporary guest workspace" : (session.user.email ?? ""),
        image: session.user.image ?? null,
      }
    : null;
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">
        <OverlayProvider>
          <Shell
            user={user}
            signOut={
              <SignOutButton
                className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-left text-[13px]"
                style={{ color: "var(--ink-2)" }}
              />
            }
          >
            {children}
          </Shell>
        </OverlayProvider>
      </body>
    </html>
  );
}
