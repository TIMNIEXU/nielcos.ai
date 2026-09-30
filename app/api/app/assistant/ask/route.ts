import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion, type ThreadCtx } from "@/lib/assistant/engine";
import { isZhLocale } from "@/lib/locale";

/* POST /api/app/assistant/ask — { thread_id?, question, locale }
   Runs the grounded Q&A engine, persists both messages, returns the answer. */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return NextResponse.json({ error: "no_company" }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const question = String(body?.question ?? "").trim().slice(0, 2000);
  if (!question) return NextResponse.json({ error: "question_required" }, { status: 400 });
  const rawLocale = String(body?.locale ?? "en");
  const locale = isZhLocale(rawLocale) ? rawLocale : "en";

  // Resolve or create thread
  let threadId: string | null = typeof body?.thread_id === "string" ? body.thread_id : null;
  let ctx: ThreadCtx = {};
  let isNew = false;
  if (threadId) {
    const { data: th } = await sb
      .from("assistant_threads")
      .select("id, context")
      .eq("id", threadId)
      .eq("company_id", cid as string)
      .maybeSingle();
    if (!th) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
    ctx = (th.context ?? {}) as ThreadCtx;
  } else {
    const { data: th, error } = await sb
      .from("assistant_threads")
      .insert({
        company_id: cid as string,
        title: question.slice(0, 60),
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    threadId = th.id;
    isNew = true;
  }

  const answer = await answerQuestion(sb, question, locale, ctx);

  await sb.from("assistant_messages").insert([
    { company_id: cid as string, thread_id: threadId, role: "user", content: question, sources: [] },
    { company_id: cid as string, thread_id: threadId, role: "assistant", content: answer.text, sources: answer.sources },
  ]);
  await sb
    .from("assistant_threads")
    .update({ context: answer.context, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return NextResponse.json({
    thread_id: threadId,
    is_new: isNew,
    answer: answer.text,
    sources: answer.sources,
  });
}
