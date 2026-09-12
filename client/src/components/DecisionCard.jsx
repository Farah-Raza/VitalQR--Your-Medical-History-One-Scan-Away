/**
 * Emergency Decision Card.
 *
 * Severity is signalled three ways at once - icon, text label, and colour -
 * so it survives a colour-blind reader and a sun-washed phone screen.
 */

const LEVELS = {
  critical: {
    label: 'Critical',
    box: 'border-red-300 bg-red-50',
    chip: 'bg-red-600 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-600" fill="currentColor" aria-hidden="true">
        <path d="M12 2 1 21h22L12 2Zm0 6 1 7h-2l1-7Zm0 9.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
      </svg>
    ),
  },
  warning: {
    label: 'Caution',
    box: 'border-amber-300 bg-amber-50',
    chip: 'bg-amber-500 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-600" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
      </svg>
    ),
  },
  info: {
    label: 'Note',
    box: 'border-slate-300 bg-slate-50',
    chip: 'bg-slate-600 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" />
      </svg>
    ),
  },
};

export default function DecisionCard({ items = [], disclaimer, compact = false }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No automatic decision prompts were generated from this profile. Read the medical facts above
        directly.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const level = LEVELS[item.level] || LEVELS.info;
        return (
          <div key={item.id} className={`rounded-lg border p-3.5 ${level.box}`}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{level.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${level.chip}`}
                  >
                    {level.label}
                  </span>
                  <p className="font-bold text-slate-900">{item.title}</p>
                </div>
                <p className={`mt-1 text-slate-800 ${compact ? 'text-sm' : 'text-[15px] leading-relaxed'}`}>
                  {item.action}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {disclaimer && (
        <p className="pt-1 text-xs leading-relaxed text-slate-500">{disclaimer}</p>
      )}
    </div>
  );
}
