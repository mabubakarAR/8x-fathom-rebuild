import "server-only";
import postgres from "postgres";

// Database access.
//
// Everything here degrades to null when DATABASE_URL is absent, and every read
// path checks. That is not defensive padding — it means the deployed app keeps
// serving the nine seeded meetings if the database is down or a key is
// rotated, instead of showing a stack trace. Uploads are the only thing that
// hard-requires it, and they say so.

// Which environment variable holds the connection string depends entirely on
// how the database got attached, and every provider picked a different name:
// Vercel Postgres sets POSTGRES_URL, the Neon integration sets DATABASE_URL,
// Prisma setups set POSTGRES_PRISMA_URL, Supabase hands you DATABASE_URL by
// hand. Reading one name and reporting "not configured" when another is
// sitting right there is an own goal — so read all of them, in the order
// that prefers a pooled connection, which is what serverless needs.
const URL_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_POSTGRES_URL",
  "NEON_DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
] as const;

const PG_URL = /^postgres(ql)?:\/\//;

/**
 * The variable actually carrying a connection string, if any.
 *
 * Known names first, then — and this is the part that matters — ANY variable
 * in the environment whose value looks like a Postgres URL. Vercel's
 * marketplace integrations let you set a prefix when you attach a store, so
 * the same Neon database can arrive as DATABASE_URL, POSTGRES_URL, or
 * MY_STORE_DATABASE_URL depending on choices made in a dialog weeks earlier.
 * Matching on the shape of the value rather than a list of names I guessed
 * makes that irrelevant.
 *
 * Pooled connections are preferred: serverless opens a lot of short-lived
 * connections and a direct one runs out of them.
 */
export function databaseUrlVar(): string | null {
  for (const name of URL_VARS) {
    const v = process.env[name];
    if (v && PG_URL.test(v)) return name;
  }
  const found = Object.keys(process.env)
    .filter((k) => {
      const v = process.env[k];
      return typeof v === "string" && PG_URL.test(v);
    })
    // Prefer a pooler, then anything that is not explicitly unpooled.
    .sort((a, b) => {
      const score = (k: string) => {
        const v = process.env[k] ?? "";
        if (/-pooler|pgbouncer=true/.test(v)) return 0;
        if (/UNPOOLED|NON_POOLING/i.test(k)) return 2;
        return 1;
      };
      return score(a) - score(b);
    });
  return found[0] ?? null;
}

/** Same trick for the blob token, which can also be prefixed. */
export function blobTokenVar(): string | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  return (
    Object.keys(process.env).find(
      (k) => /BLOB/i.test(k) && /TOKEN/i.test(k) && process.env[k],
    ) ?? null
  );
}

function databaseUrl(): string | null {
  const name = databaseUrlVar();
  return name ? (process.env[name] as string) : null;
}

let sqlSingleton: postgres.Sql | null | undefined;

export function db(): postgres.Sql | null {
  if (sqlSingleton !== undefined) return sqlSingleton;

  const url = databaseUrl();
  if (!url) {
    sqlSingleton = null;
    return null;
  }

  sqlSingleton = postgres(url, {
    // Serverless: many short-lived lambdas, so keep the pool tiny and let the
    // provider's pooler (Neon's, or Supabase's) do the real pooling.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false, // required when talking to a transaction-mode pooler
    onnotice: () => {},
  });
  return sqlSingleton;
}

export function dbConfigured(): boolean {
  return Boolean(databaseUrl());
}

/**
 * Which integration variables this deployment can actually see.
 *
 * Names only, never values. When "database: false" comes back from a
 * deployment where the database is plainly connected, the useful question is
 * *which variable did it land in* — and guessing that over chat is slow.
 */
export function envReport() {
  const watched = [
    ...URL_VARS,
    "BLOB_READ_WRITE_TOKEN",
    "ANTHROPIC_API_KEY",
    "DEEPGRAM_API_KEY",
  ];
  const present: string[] = [];
  const missing: string[] = [];
  for (const n of watched) (process.env[n] ? present : missing).push(n);

  const keys = Object.keys(process.env);
  return {
    present,
    missing,
    // Every variable whose VALUE is a Postgres URL, whatever it is called.
    // If this is empty, the deployment genuinely has no database attached —
    // no amount of renaming will help and the next step is a redeploy.
    postgresShaped: keys.filter((k) => {
      const v = process.env[k];
      return typeof v === "string" && PG_URL.test(v);
    }),
    blobShaped: keys.filter((k) => /BLOB/i.test(k) && /TOKEN/i.test(k) && process.env[k]),
    // Names of anything storage-ish, to catch a prefix we would otherwise
    // have to guess at. Names only — never values.
    storageish: keys.filter((k) => /POSTGRES|NEON|DATABASE|BLOB|STORAGE|PG(HOST|USER|DATABASE)/i.test(k)),
    totalVars: keys.length,
  };
}

/** Runs schema.sql. Idempotent — every statement is CREATE … IF NOT EXISTS. */
export async function migrate(): Promise<{ ok: boolean; message: string }> {
  const sql = db();
  if (!sql) {
    return {
      ok: false,
      message:
        "No Postgres connection string found. Looked for: " + URL_VARS.join(", "),
    };
  }

  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const schema = await readFile(join(process.cwd(), "src/lib/db/schema.sql"), "utf8");

  try {
    await sql.unsafe(schema);
    // Columns added after the first deploy. `add column if not exists` is
    // idempotent, so running the whole schema again is always safe — but a
    // table that already existed will not pick these up from CREATE TABLE.
    await sql.unsafe(`
      alter table meetings add column if not exists media_url text;
      alter table meetings add column if not exists origin text not null default 'import';
      alter table meetings add column if not exists transcript_source text;
      alter table meetings add column if not exists shape jsonb not null default '[]'::jsonb;
    `);
    return { ok: true, message: "schema applied" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
