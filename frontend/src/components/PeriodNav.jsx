export default function PeriodNav({ period, back, onOlder, onNewer, maxBack = 120 }) {
  const btn = 'flex h-11 w-11 items-center justify-center rounded-[12px] bg-raised text-sm text-sub transition-colors hover:bg-active hover:text-ink disabled:opacity-40 dark:bg-[#1e211c]'
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={back >= maxBack}
        onClick={onOlder}
        aria-label="Periode sebelumnya"
        className={btn}
      >
        <span aria-hidden>‹</span>
      </button>
      <span className="min-w-0 whitespace-nowrap px-1 text-xs font-semibold text-sub tnum">
        {period?.label ?? '…'}
      </span>
      <button
        type="button"
        disabled={back <= 0}
        onClick={onNewer}
        aria-label="Periode berikutnya"
        className={btn}
      >
        <span aria-hidden>›</span>
      </button>
    </div>
  )
}
