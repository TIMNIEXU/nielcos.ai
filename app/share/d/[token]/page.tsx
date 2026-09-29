import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, [string, string]> = {
  arrival_notice: ["到货通知", "Arrival Notice"],
  bill_of_lading: ["提单", "Bill of Lading"],
  commercial_invoice: ["商业发票", "Commercial Invoice"],
  packing_list: ["箱单", "Packing List"],
  other: ["其他", "Other"],
};

const TYPE_TONE: Record<string, string> = {
  arrival_notice: "bg-blue-50 text-blue-700 border-blue-200",
  bill_of_lading: "bg-violet-50 text-violet-700 border-violet-200",
  commercial_invoice: "bg-emerald-50 text-emerald-700 border-emerald-200",
  packing_list: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

function prettyKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function ShareDocPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = await createClient();

  // Visible to everyone via the "share link read" policy (active token only).
  const { data: doc } = await sb
    .from("documents")
    .select(
      "id, company_id, file_name, file_path, file_size, doc_type, extracted, parse_status, version_no, created_at, share_expires_at"
    )
    .eq("share_token", token)
    .maybeSingle();

  if (!doc) notFound();
  if (doc.share_expires_at && new Date(doc.share_expires_at) < new Date()) notFound();

  // Members of the owning company get a real download button.
  let downloadUrl: string | null = null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) {
    const { data: ownCompany } = await sb.rpc("own_company_id");
    if (ownCompany && ownCompany === doc.company_id) {
      const { data: signed } = await sb.storage
        .from("shipment-docs")
        .createSignedUrl(doc.file_path, 3600);
      if (signed?.signedUrl) downloadUrl = signed.signedUrl;
    }
  }

  const { data: gttid } = await sb.rpc("shared_doc_gttid", { p_token: token });

  const ex = (doc.extracted ?? {}) as {
    fields?: Record<string, string>;
    containers?: { container: string }[];
    charges?: { description: string; amount: number }[];
  };
  const fields = Object.entries(ex.fields ?? {}).filter(([, v]) => v != null && v !== "");
  const [zhType, enType] = TYPE_LABEL[doc.doc_type ?? "other"] ?? TYPE_LABEL.other;

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0f1b2d]">
      <div className="mx-auto max-w-2xl">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-[#1b7fc1]">
          NIEL COS · 单证分享 / DOCUMENT SHARE
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#e2e8f2] bg-white shadow-[0_12px_40px_-16px_rgba(27,127,193,0.25)]">
          <div className="border-b border-[#eef2f7] bg-gradient-to-br from-[#eaf4fc] to-white px-6 py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${TYPE_TONE[doc.doc_type ?? "other"] ?? TYPE_TONE.other}`}
              >
                {zhType} · {enType}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                v{doc.version_no ?? 1}
              </span>
            </div>
            <h1 className="mt-3 break-all text-xl font-extrabold">{doc.file_name}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {gttid ? (
                <>所属货运 Shipment · <span className="font-bold text-[#1b7fc1]">{gttid}</span> · </>
              ) : null}
              {new Date(doc.created_at).toLocaleDateString("zh-CN")}
              {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
            </p>
          </div>

          <div className="px-6 py-6">
            {doc.parse_status === "parsed" && fields.length > 0 ? (
              <>
                <h2 className="text-sm font-extrabold">AI 解析结果 <span className="font-medium text-slate-400">/ Extracted data</span></h2>
                <dl className="mt-3 overflow-hidden rounded-2xl border border-[#eef2f7]">
                  {fields.map(([k, v], i) => (
                    <div key={k} className={`flex gap-3 px-4 py-2.5 text-sm ${i % 2 ? "bg-[#f8fafd]" : "bg-white"}`}>
                      <dt className="w-40 shrink-0 font-semibold text-slate-500">{prettyKey(k)}</dt>
                      <dd className="break-all font-medium">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
                {(ex.containers?.length ?? 0) > 0 && (
                  <p className="mt-3 text-sm text-slate-600">
                    集装箱 Containers：<span className="font-bold text-[#0f1b2d]">{ex.containers!.map((c) => c.container).join(" · ")}</span>
                  </p>
                )}
                {(ex.charges?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-extrabold">费用 <span className="font-medium text-slate-400">/ Charges</span></h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {ex.charges!.map((c, i) => (
                        <li key={i} className="flex justify-between rounded-xl bg-[#f8fafd] px-4 py-2">
                          <span className="text-slate-600">{c.description}</span>
                          <span className="font-bold">${Number(c.amount).toLocaleString("en-US")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">AI 解析进行中或暂无可提取内容 / Parsing in progress or no extractable content.</p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-[#1b7fc1] px-6 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-[#1569a0]"
                >
                  下载原文件 / Download file
                </a>
              ) : (
                <a
                  href="/login"
                  className="rounded-2xl border border-[#1b7fc1]/30 bg-white px-6 py-3 text-center text-sm font-bold text-[#1b7fc1] transition-colors hover:bg-[#eaf4fc]"
                >
                  登录后下载原文件 / Sign in to download
                </a>
              )}
              {doc.share_expires_at && (
                <p className="text-center text-xs text-slate-400">
                  链接有效期至 / Valid until {new Date(doc.share_expires_at).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          此分享由单证所属公司生成 · Shared by the document owner via Niel COS
        </p>
      </div>
    </main>
  );
}
