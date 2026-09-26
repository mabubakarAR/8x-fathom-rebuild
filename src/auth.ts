import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db/client";

// Sign in with Google, and only Google.
//
// Fathom itself is Google / Microsoft sign-in only. Sign-in asks for identity
// and nothing else, so it is a two-click flow with no warnings. The calendar
// is a SEPARATE consent — "Connect Google Calendar" on the home page — because
// calendar.readonly is a Google "sensitive" scope and an unverified app
// asking for it gets a full-page "Google hasn't verified this app" screen.
// Putting that in front of every sign-in would cost more users than the
// calendar wins; putting it behind a button the user chose to press is fine.
// This is also how Fathom does it.
//
// JWT sessions rather than database sessions: nothing about the session needs
// to be revocable from the server side in this product, and it saves a
// round-trip on every request. The user row exists so meetings have an owner.

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; calendar: boolean };
  }
}

const SIGN_IN_SCOPES = ["openid", "email", "profile"].join(" ");
export const CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // Auth.js looks for AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET by default and
      // silently sends client_id=undefined when they're absent. The names
      // used here are the ones Google's own docs use; say so explicitly.
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: SIGN_IN_SCOPES,
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.sub ?? token.sub;
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
        const sql = db();
        const hasCalendar = (account.scope ?? "").includes("calendar");
        if (sql && token.sub) {
          // Upsert the user; keep an existing refresh token if Google didn't
          // send a new one (it only does on the first consent).
          await sql`
            insert into users (id, email, name, image, google_refresh_token, calendar_connected)
            values (${token.sub}, ${token.email ?? ""}, ${token.name ?? ""}, ${token.picture ?? null},
                    ${account.refresh_token ?? null}, ${hasCalendar})
            on conflict (id) do update set
              email = excluded.email,
              name = excluded.name,
              image = excluded.image,
              google_refresh_token = coalesce(excluded.google_refresh_token, users.google_refresh_token),
              calendar_connected = users.calendar_connected or excluded.calendar_connected,
              last_seen_at = now()`;
        }
        // Whether the calendar is connected is a fact about the user row, not
        // about this particular sign-in: someone who connected it last week
        // and signs in again today still has it.
        if (sql && token.sub) {
          const rows = await sql<{ calendar_connected: boolean }[]>`
            select calendar_connected from users where id = ${token.sub}`;
          token.calendar = Boolean(rows[0]?.calendar_connected) || hasCalendar;
        } else {
          token.calendar = hasCalendar;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.calendar = Boolean(token.calendar);
      return session;
    },
  },
});

/** The signed-in user's id, or null. For server components and routes. */
export async function currentUserId(): Promise<string | null> {
  const s = await auth();
  return s?.user?.id || null;
}
