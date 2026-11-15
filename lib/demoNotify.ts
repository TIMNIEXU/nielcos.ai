/**
 * Email notification for new demo requests, sent via Resend.
 *
 * No-ops silently when RESEND_API_KEY is not configured, so the site
 * works before the key is added. Optional env:
 *   DEMO_NOTIFY_TO   recipient (default tim@jomainc.com. Resend's
 *                     onboarding sender can only deliver to the account
 *                     owner until the nielcos.ai domain is verified in
 *                     Resend; set this to sales@nielcos.ai after that)
 *   DEMO_NOTIFY_FROM sender (default Resend's onboarding sender)
 */
export async function notifyNewDemoRequest(d: {
  name: string;
  company: string | null;
  email: string;
  message: string | null;
  locale: string | null;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = process.env.DEMO_NOTIFY_TO || "tim@jomainc.com";
  const from =
    process.env.DEMO_NOTIFY_FROM ||
    "NIEL COS Website <onboarding@resend.dev>";

  const lines = [
    `Name: ${d.name}`,
    d.company ? `Company: ${d.company}` : null,
    `Email: ${d.email}`,
    d.locale ? `Locale: ${d.locale}` : null,
    d.message ? `Message: ${d.message}` : null,
    "",
    "Stored in Supabase: demo_requests",
  ].filter((l): l is string => l !== null);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: d.email,
        subject: `New demo request: ${d.name}${d.company ? ` (${d.company})` : ""}`,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("demo notify failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("demo notify error:", e);
  }
}
