/* TEMPORARY — one-shot UI translation for new locales (vi/ko/ja).
   Guarded by a single-use token. DELETE THIS FILE after the batch run. */
import { NextRequest, NextResponse } from "next/server";

const TOKEN = "63QUw0uCNq6OzP92ouUCVJWJGqvESCsU";
const LANGS: Record<string, string> = { vi: "VI", ko: "KO", ja: "JA" };

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = process.env.DEEPL_API_KEY;
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 500 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const tl = LANGS[String(body?.target ?? "")];
  const texts: string[] = Array.isArray(body?.texts)
    ? body.texts.map((t: unknown) => String(t).slice(0, 2000))
    : [];
  if (!tl || texts.length === 0 || texts.length > 50)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const r = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texts, source_lang: "EN", target_lang: tl }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok)
      return NextResponse.json({ error: `deepl_${r.status}` }, { status: 502 });
    const j = await r.json();
    const out: string[] = (j.translations ?? []).map(
      (x: { text: string }) => x.text
    );
    if (out.length !== texts.length)
      return NextResponse.json({ error: "count_mismatch" }, { status: 502 });
    return NextResponse.json({ translations: out });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
