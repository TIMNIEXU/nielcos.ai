import { NextRequest, NextResponse } from "next/server";

// TEMPORARY machine-translation endpoint for the i18n batch job.
// Deleted immediately after use. Guarded by a one-time secret header.
const SECRET = "bvYpgBiwddpx0BnoeEXW7qWB";
const DEEPL_URL = "https://api-free.deepl.com/v2/translate";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-mt-secret") !== SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = process.env.DEEPL_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });
  const body = await req.json();
  const target: string = body.target;
  const items: { key: string; en: string }[] = body.items ?? [];
  if (!["VI", "KO", "JA"].includes(target) || items.length === 0 || items.length > 120) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const out: { key: string; text: string }[] = [];
  // DeepL free: batch up to ~50 texts per call to stay safe
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    const res = await fetch(DEEPL_URL, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: chunk.map((c) => c.en),
        source_lang: "EN",
        target_lang: target,
        preserve_formatting: true,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `deepl ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    data.translations.forEach((tr: { text: string }, j: number) => {
      out.push({ key: chunk[j].key, text: tr.text });
    });
  }
  return NextResponse.json({ translations: out });
}
