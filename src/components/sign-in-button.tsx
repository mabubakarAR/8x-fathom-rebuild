import { signIn, signOut, CALENDAR_SCOPES } from "@/auth";

// Server actions, so the buttons work with no client JavaScript at all.

export function SignInButton({ label = "Continue with Google", className, style, next }: { label?: string; className?: string; style?: React.CSSProperties; next?: string }) {
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo });
      }}
    >
      <button type="submit" className={className} style={style}>
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden className="mr-2 inline-block align-[-3px]">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/>
          <path fill="#FBBC05" d="M10.4 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
        </svg>
        {label}
      </button>
    </form>
  );
}

export function SignOutButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className={className} style={style}>Sign out</button>
    </form>
  );
}

/**
 * The second consent: calendar. Google shows its "unverified app" warning
 * here because calendar.readonly is a sensitive scope and this app has not
 * been through verification. That is stated next to the button rather than
 * discovered on the next screen.
 */
export function ConnectCalendarButton({ className, style, label = "Connect Google Calendar" }: { className?: string; style?: React.CSSProperties; label?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(
          "google",
          { redirectTo: "/" },
          {
            scope: CALENDAR_SCOPES,
            // offline + consent is what makes Google hand back a refresh
            // token, which is what lets the calendar be read later without
            // the user present.
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
          },
        );
      }}
    >
      <button type="submit" className={className} style={style}>{label}</button>
    </form>
  );
}

/**
 * Temporary reviewer access. The Google OAuth client behind this app is
 * unverified, and some Workspace domains refuse consent to unverified apps
 * outright. Rather than let that be the end of a review, a guest gets a
 * throw-away user with the sample workspace loaded. It is deliberately not
 * dressed up as a real feature: the tooltip says what it is.
 */
export const GUEST_NOTE =
  "Temporary access for reviewers. Use this only if Google sign-in is blocked on your account. " +
  "It creates a throw-away workspace with the sample meetings loaded — no calendar, no Google data, and it is not a product feature.";

export function GuestSignInButton({ className, style, label = "Continue as guest", next }: { className?: string; style?: React.CSSProperties; label?: string; next?: string }) {
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <form
      action={async () => {
        "use server";
        await signIn("guest", { redirectTo });
      }}
      className="lp-tip relative inline-flex"
    >
      <button type="submit" className={className} style={style} aria-describedby="guest-note">
        {label}
        <span aria-hidden className="ml-2 rounded-full border border-current px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">temporary</span>
      </button>
      <span role="tooltip" id="guest-note" className="lp-tip-body">{GUEST_NOTE}</span>
    </form>
  );
}
