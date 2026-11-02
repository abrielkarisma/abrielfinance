export default function PeriodNav({ period, back, onOlder, onNewer, maxBack = 120 }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={back >= maxBack}
        onClick={onOlder}
        aria-label="Periode sebelumnya"
        className="h-9 w-9 rounded-[10px] border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        ◀
      </button>
      <span className="min-w-0 whitespace-nowrap px-1 text-xs font-semibold text-slate-500">
        {period?.label ?? '…'}
      </span>
      <button
        type="button"
        disabled={back <= 0}
        onClick={onNewer}
        aria-label="Periode berikutnya"
        className="h-9 w-9 rounded-[10px] border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        ▶
      </button>
    </div>
  )
}
