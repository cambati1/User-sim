const SUGGESTIONS = [
  'Is the CTA obvious?',
  'Is the hierarchy clear?',
  'Does spacing feel balanced?',
  'Is the color scheme accessible?',
  'Is there too much going on?',
  'Does it feel trustworthy?',
]

/**
 * Props:
 *   value: string  (current textarea value)
 *   onChange: (newValue: string) => void
 */
export default function QuestionChips({ value, onChange }) {
  function toggle(suggestion) {
    const lines = value.split('\n').map(l => l.trim()).filter(Boolean)
    const exists = lines.includes(suggestion)
    const next = exists
      ? lines.filter(l => l !== suggestion)
      : [...lines, suggestion]
    onChange(next.join('\n'))
  }

  const active = new Set(value.split('\n').map(l => l.trim()).filter(Boolean))

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {SUGGESTIONS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
          className={[
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            active.has(s)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
              : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500',
          ].join(' ')}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
