/**
 * NIEL GROUP global bar — identical line on every group site
 * (NIEL GROUP DIGITAL ARCHITECTURE v1.0, section 3).
 */
export default function GroupBar() {
  return (
    <div className="border-b border-white/10 bg-[#0c1a33] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-1.5 lg:px-8">
        <a
          href="https://www.nielsc.com?utm_source=www-nielcos.ai&utm_medium=group_nav"
          className="text-[11px] font-bold tracking-[0.22em] text-[#8fb4ff] uppercase transition-colors hover:text-white"
        >
          NIEL Group
        </a>
        <p className="truncate text-[11px] font-medium tracking-wide text-white/60">
          Supply Chain&nbsp;&middot;&nbsp;Customs&nbsp;&middot;&nbsp;Logistics&nbsp;&middot;&nbsp;Insurance&nbsp;&middot;&nbsp;Technology
        </p>
      </div>
    </div>
  );
}
