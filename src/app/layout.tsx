import type { Metadata } from "next";
import "./globals.css";
import { OverlayProvider } from "@/lib/overlay";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Sonar — AI meeting notetaker",
  description:
    "A rebuild of Fathom. Auto-chaptered transcripts, cited summaries, speaker repair and blended search — built for the eight-person hour-long call.",
};

// Applied before paint so a dark-mode viewer never sees a white flash. Reading
// localStorage here can throw (private mode), hence the try/catch.
const THEME_BOOT = `(function(){try{var s=localStorage.getItem("sonar.overlay.v1");if(s){var t=JSON.parse(s).theme;if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="antialiased">
        <OverlayProvider>
          <Shell>{children}</Shell>
        </OverlayProvider>
      </body>
    </html>
  );
}
