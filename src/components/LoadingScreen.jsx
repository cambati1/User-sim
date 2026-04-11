const STEPS = [
  'Screenshot uploaded',
  'AI reading your design…',
  'Generating annotations',
  'Creating your share link',
]

/**
 * Props:
 *   step: number  (0-3, current active step index)
 */
export default function LoadingScreen({ step }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
      <p className="text-lg font-bold text-slate-800">Analyzing your design…</p>
      <p className="text-sm text-slate-500">This usually takes 5–10 seconds</p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                done   ? 'bg-green-100 text-green-600' :
                active ? 'bg-indigo-100 text-indigo-600 animate-pulse' :
                         'bg-slate-100 text-slate-400',
              ].join(' ')}>
                {done ? '✓' : i + 1}
              </div>
              <span className={done ? 'text-slate-400' : active ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
