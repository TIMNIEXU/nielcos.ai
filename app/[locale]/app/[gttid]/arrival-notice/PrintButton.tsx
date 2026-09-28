"use client";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
    >
      {label}
    </button>
  );
}
