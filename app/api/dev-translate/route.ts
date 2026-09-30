import { NextRequest, NextResponse } from "next/server";

/* TEMPORARY one-time translation route — deleted after use.
   POST { token, target_lang, texts: string[] } -> { translations: string[] }
   Token-gated. Uses the server-side DEEPL_API_KEY (Free API endpoint). */

const TOKEN = "xEZY1tWkfwrJaQlXU65ctSVl";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || body.token !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = process.env.DEEPL_API_KEY;
  if (!key) return NextResponse.json({ error: "no_deepl_key" }, { status: 500 });
  const target = String(body.target_lang ?? "").toUpperCase();
  const texts: string[] = Array.isArray(body.texts) ? body.texts : [];
  if (!target || texts.length === 0 || texts.length > 50) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const params = new URLSearchParams();
  params.set("auth_key", key);
  params.set("source_lang", "EN");
  params.set("target_lang", target);
  for (const t of texts) params.append("text", String(t));
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    body: params,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "deepl_failed", detail: err.slice(0, 200) },
      { status: 502 }
    );
  }
  const data = await res.json();
  return NextResponse.json({
    translations: (data.translations ?? []).map((x: { text: string }) => x.text),
  });
}
