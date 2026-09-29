/* Machine translation for regulatory updates (EN -> ZH).
   Backend: DeepL free tier (500k chars/month, no card). Set DEEPL_API_KEY
   in Vercel env. Without a key this is a graceful no-op — callers fall
   back to the English original. Translations are cached in the DB so each
   item is translated once. */

export async function translateToZh(texts: string[]): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY;
  const clean = texts.map((t) => (t ?? "").slice(0, 4000));
  if (!key || clean.every((t) => !t.trim())) return texts;
  try {
    const r = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: clean, target_lang: "ZH", source_lang: "EN" }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return texts;
    const j = await r.json();
    const out: string[] = (j.translations ?? []).map((x: { text: string }) => x.text);
    return out.length === clean.length ? out : texts;
  } catch {
    return texts;
  }
}
