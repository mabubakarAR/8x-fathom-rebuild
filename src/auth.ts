import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db/client";

// Sign in with Google, and only Google.
//
// Fathom itself is Google / Microsoft sign-in only, and the calendar is the
// reason: a meeting notetaker that does not know when your meetings are is a
// voice recorder. So the sign-in is also the calendar connection — one
// consent screen asks for identity and read access to the calendar together,
// and a refresh token is kept server-side so the calendar can be read again
// later without the user present.
//
// JWT sessions rather than database sessions: nothing about the session needs
// to be revocable from the server side in this product, and it saves a
// round-trip on every request. The user row exists so meetings have an owner.

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; calendar: boolean };
  }
}

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: SCOPES,
          // offline + consent is what makes Google hand back a refresh token,
          // and it only does so on the FIRST consent unless prompt=consent.
          access_type: "offline",
          prompt: "consent",
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
        token.calendar = hasCalendar;
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
