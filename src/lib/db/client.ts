import "server-only";
import postgres from "postgres";

// Database access.
//
// Everything here degrades to null when DATABASE_URL is absent, and every read
// path checks. That is not defensive padding — it means the deployed app keeps
// serving the nine seeded meetings if the database is down or a key is
// rotated, instead of showing a stack trace. Uploads are the only thing that
// hard-requires it, and they say so.

let sqlSingleton: postgres.Sql | null | undefined;

export function db(): postgres.Sql | null {
  if (sqlSingleton !== undefined) return sqlSingleton;

  const url = process.env.DATABASE_URL;
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
  return Boolean(process.env.DATABASE_URL);
}

/** Runs schema.sql. Idempotent — every statement is CREATE … IF NOT EXISTS. */
export async function migrate(): Promise<{ ok: boolean; message: string }> {
  const sql = db();
  if (!sql) return { ok: false, message: "DATABASE_URL is not set" };

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
