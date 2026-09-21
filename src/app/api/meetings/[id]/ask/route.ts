import { NextResponse } from "next/server";
import { ask } from "@/lib/pipeline/ask";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Grounded Ask over persisted segments, with the thread stored so it
 *  survives navigation - the thing Fathom's own docs say theirs does not. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = db();
  if (!sql) return NextResponse.json({ error: "no database" }, { status: 503 });

  const { question, threadId } = (await req.json()) as { question?: string; threadId?: string };
  if (!question?.trim()) return NextResponse.json({ error: "no question" }, { status: 400 });

  try {
    const result = await ask(id, question.trim());

    const tid = threadId || `th-${Date.now().toString(36)}`;
    await sql`
      insert into ask_threads (id, meeting_id, title)
      values (${tid}, ${id}, ${question.trim().slice(0, 80)})
      on conflict (id) do nothing`;

    const n = await sql<{ n: number }[]>`
      select coalesce(max(idx), -1) + 1 as n from ask_messages where thread_id = ${tid}`;
    const base = n[0]?.n ?? 0;

    await sql`
      insert into ask_messages (id, thread_id, role, text, citations, idx)
      values (${`${tid}-${base}`}, ${tid}, 'user', ${question.trim()}, '[]'::jsonb, ${base})`;
    await sql`
      insert into ask_messages (id, thread_id, role, text, citations, model, idx)
      values (${`${tid}-${base + 1}`}, ${tid}, 'assistant', ${result.text},
              ${JSON.stringify(result.citations)}::jsonb, ${result.model}, ${base + 1})`;

    return NextResponse.json({ ...result, threadId: tid });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ask failed" },
      { status: 500 },
    );
  }
}
