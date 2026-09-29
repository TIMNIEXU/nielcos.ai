import { useTranslations } from "next-intl";

/* Minimal stroke icons for the mock sidebar */
function I({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  doc: "M6 2h9l5 5v15H6zM14 2v6h6",
  truck: "M1 5h13v11H1zM14 9h4l4 4v3h-8zM5.5 19a1.8 1.8 0 1 0 0 .01M17.5 19a1.8 1.8 0 1 0 0 .01",
  shield: "M12 2 4 5.5V12c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V5.5z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  bot: "M12 2a7 7 0 0 1 7 7v10H5V9a7 7 0 0 1 7-7zM9 12h.01M15 12h.01",
};

function Kpi({ icon, tint, label, value, delta, deltaColor }: {
  icon: keyof typeof ICONS; tint: string; label: string; value: string; delta: string; deltaColor: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tint}`}>
          <I d={ICONS[icon]} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium text-muted">{label}</p>
          <p className="text-[17px] font-bold tracking-tight text-ink">{value}</p>
        </div>
      </div>
      <p className={`mt-1.5 text-[10px] font-semibold ${deltaColor}`}>{delta}</p>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: string; children: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${tone}`}>
      {children}
    </span>
  );
}

/** Stylized trade-lane map: dotted canvas, dashed arcs, port pins */
function TradeMap() {
  const ports = [
    { x: 62, y: 118, c: "#16a34a", l: "LA" },
    { x: 128, y: 100, c: "#16a34a", l: "NY" },
    { x: 205, y: 66, c: "#16a34a", l: "RTM" },
    { x: 318, y: 100, c: "#dc2626", l: "SHA" },
    { x: 300, y: 152, c: "#0284c7", l: "SIN" },
  ];
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full">
      <defs>
        <pattern id="mdots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#c9d8f2" />
        </pattern>
      </defs>
      <rect width="400" height="220" fill="url(#mdots)" rx="8" opacity="0.55" />
      {/* arcs */}
      <path d="M62 118 Q 95 60, 128 100" stroke="#1d4ed8" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M128 100 Q 165 40, 205 66" stroke="#1d4ed8" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M205 66 Q 265 40, 318 100" stroke="#d97706" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M318 100 Q 310 128, 300 152" stroke="#0284c7" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.65" />
      <path d="M62 118 Q 190 190, 318 100" stroke="#1d4ed8" strokeWidth="1.4" strokeDasharray="4 5" fill="none" opacity="0.4" />
      {/* ports */}
      {ports.map((p) => (
        <g key={p.l}>
          <circle cx={p.x} cy={p.y} r="9" fill={p.c} opacity="0.18" />
          <circle cx={p.x} cy={p.y} r="4.5" fill={p.c} stroke="#fff" strokeWidth="1.6" />
          <text x={p.x + 10} y={p.y + 3.5} fontSize="9.5" fontWeight="700" fill="#0e1e38">{p.l}</text>
        </g>
      ))}
      {/* legend */}
      <g fontSize="9" fontWeight="600" fill="#5d6f89">
        <circle cx="14" cy="206" r="3.5" fill="#16a34a" /><text x="21" y="209">On Time</text>
        <circle cx="72" cy="206" r="3.5" fill="#d97706" /><text x="79" y="209">At Risk</text>
        <circle cx="126" cy="206" r="3.5" fill="#dc2626" /><text x="133" y="209">Delayed</text>
      </g>
    </svg>
  );
}

function Donut() {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[86px] w-[86px]">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#e8eef7" strokeWidth="9" />
        <circle cx="38" cy="38" r={r} fill="none" stroke="#16a34a" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${c * 0.92} ${c}`} />
        <circle cx="38" cy="38" r={r} fill="none" stroke="#1d4ed8" strokeWidth="9"
          strokeDasharray={`${c * 0.06} ${c}`} strokeDashoffset={-c * 0.92} opacity="0.85" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[16px] font-bold text-ink">92%</p>
          <p className="text-[8px] font-medium text-muted">compliance</p>
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  { id: "NIEL25040123", lane: "Shanghai → Los Angeles", s: "On Time", tone: "bg-ok-tint text-ok", eta: "May 3" },
  { id: "NIEL25040124", lane: "Shenzhen → New York", s: "At Risk", tone: "bg-warn-tint text-warn", eta: "May 5" },
  { id: "NIEL25040125", lane: "Hamburg → Chicago", s: "On Time", tone: "bg-ok-tint text-ok", eta: "May 7" },
  { id: "NIEL25040126", lane: "Tokyo → Los Angeles", s: "Delayed", tone: "bg-risk-tint text-risk", eta: "May 6" },
];

const BARS = [38, 46, 42, 58, 66, 74, 88, 96];

export default function DashboardMock() {
  const t = useTranslations("mock");
  const nav = ["home", "doc", "truck", "shield", "box", "bot"] as const;

  return (
    <div className="relative">
      {/* floating badges */}
      <div className="floaty absolute -top-5 -left-4 z-10 hidden items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-pop sm:flex">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ok-tint text-ok">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <div>
          <p className="text-[11px] font-bold text-ink">HTS 8471.30</p>
          <p className="text-[10px] font-medium text-ok">−5.0% duty saved</p>
        </div>
      </div>
      <div className="floaty-slow absolute -right-4 top-1/3 z-10 hidden items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-pop sm:flex">
        <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-ok" />
        <p className="text-[11px] font-bold text-ink"><span className="font-medium text-muted">Live tracking</span></p>
      </div>

      {/* browser frame */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
        <div className="flex items-center gap-2 border-b border-line bg-card-soft px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 hidden rounded-md bg-white px-3 py-1 text-[10px] font-medium text-faint ring-1 ring-line sm:block">
            app.nielcos.ai/dashboard
          </span>
        </div>

        <div className="flex">
          {/* icon rail */}
          <div className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-card-soft/60 py-4 sm:flex">
            <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-brand text-[12px] font-bold text-white">N</span>
            {nav.map((n, i) => (
              <span key={n} className={`grid h-9 w-9 place-items-center rounded-lg ${i === 0 ? "bg-brand-tint text-brand" : "text-faint"}`}>
                <I d={ICONS[n]} />
              </span>
            ))}
          </div>

          {/* main */}
          <div className="min-w-0 flex-1 bg-canvas/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold tracking-tight text-ink">{t("greeting")}</p>
                <p className="text-[10.5px] text-muted">{t("greetSub")}</p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-muted ring-1 ring-line md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> New York 18°C
              </span>
            </div>

            {/* KPIs */}
            <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Kpi icon="box" tint="bg-sky-tint text-sky" label={t("kpi1")} value="1,248" delta="↑ 12% vs. last 7 days" deltaColor="text-ok" />
              <Kpi icon="doc" tint="bg-ok-tint text-ok" label={t("kpi2")} value="86" delta="↑ 8% vs. last 7 days" deltaColor="text-ok" />
              <Kpi icon="shield" tint="bg-risk-tint text-risk" label={t("kpi3")} value="23" delta="↑ 35% vs. last 7 days" deltaColor="text-risk" />
              <Kpi icon="truck" tint="bg-vio-tint text-vio" label={t("kpi4")} value="$2.4M" delta="↑ 18% vs. last 7 days" deltaColor="text-ok" />
            </div>

            {/* map + AI */}
            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[1.55fr_1fr]">
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11.5px] font-bold text-ink">{t("mapTitle")}</p>
                  <span className="text-[10px] font-semibold text-brand">{t("viewAll")}</span>
                </div>
                <div className="h-[190px]"><TradeMap /></div>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11.5px] font-bold text-ink">{t("aiTitle")}</p>
                  <span className="text-[10px] font-semibold text-brand">{t("viewAll")}</span>
                </div>
                <p className="mb-2 rounded-lg bg-risk-tint/60 px-2.5 py-1.5 text-[10.5px] font-bold text-risk">
                  <span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full bg-risk text-[9px] text-white">3</span>
                  {t("riskTitle")}
                </p>
                {[
                  { c: "bg-risk-tint text-risk", tt: "Tariff exposure", dd: "Ranked by dollar impact" },
                  { c: "bg-warn-tint text-warn", tt: "Customs delay", dd: "Missing documents flagged" },
                  { c: "bg-vio-tint text-vio", tt: "Supplier documentation", dd: "Certificates pending review" },
                ].map((r) => (
                  <div key={r.tt} className="flex items-center gap-2 border-b border-line-soft py-2 last:border-0">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${r.c}`}>
                      <I d={ICONS.shield} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-bold text-ink">{r.tt}</p>
                      <p className="truncate text-[9.5px] text-muted">{r.dd}</p>
                    </div>
                  </div>
                ))}
                <span className="mt-2 block rounded-lg bg-brand py-2 text-center text-[11px] font-bold text-white">
                  {t("analyze")} →
                </span>
              </div>
            </div>

            {/* table + donut + bars */}
            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[1.55fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="flex items-center justify-between px-3 pt-2.5">
                  <p className="text-[11.5px] font-bold text-ink">{t("recent")}</p>
                  <span className="text-[10px] font-semibold text-brand">{t("viewAll")}</span>
                </div>
                <table className="mt-1 w-full text-left">
                  <tbody>
                    {ROWS.map((r) => (
                      <tr key={r.id} className="border-t border-line-soft">
                        <td className="px-3 py-2 font-mono text-[9.5px] text-muted">{r.id}</td>
                        <td className="px-3 py-2 text-[10px] font-medium text-ink">{r.lane}</td>
                        <td className="px-3 py-2"><StatusPill tone={r.tone}>{r.s}</StatusPill></td>
                        <td className="px-3 py-2 text-[10px] text-muted">{r.eta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-white p-2">
                  <Donut />
                </div>
                <div className="rounded-xl border border-line bg-white p-3">
                  <p className="text-[10px] font-bold text-ink">Trade Flow</p>
                  <div className="mt-2 flex h-[64px] items-end gap-1">
                    {BARS.map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-brand/85" style={{ height: `${h}%`, opacity: 0.45 + (i / BARS.length) * 0.55 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
