/**
 * Props:
 *   aiAnnotations: Array<{ comment }>
 *   humanAnnotations: Array<{ id, comment }>
 *   activeTab: 'all' | 'ai' | 'human'
 *   onTabChange: (tab: 'all' | 'ai' | 'human') => void
 *   onAddAnnotation: () => void
 */
export default function AnnotationSidebar({ aiAnnotations, humanAnnotations, activeTab, onTabChange, onAddAnnotation }) {
  const total = aiAnnotations.length + humanAnnotations.length

  const tabs = [
    { key: 'all',   label: `All (${total})` },
    { key: 'ai',    label: `AI (${aiAnnotations.length})` },
    { key: 'human', label: `Human (${humanAnnotations.length})` },
  ]

  const aiVisible    = activeTab !== 'human' ? aiAnnotations    : []
  const humanVisible = activeTab !== 'ai'    ? humanAnnotations : []
  let counter = 0

  return (
    <div className="w-72 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={[
              'flex-1 py-3 text-xs font-semibold border-b-2 transition-colors',
              activeTab === t.key
                ? 'text-white border-indigo-400'
                : 'text-slate-500 border-transparent hover:text-slate-300',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {aiVisible.map((ann, i) => {
          counter++
          const n = counter
          return (
            <div key={`ai-${i}`} className="bg-slate-900 rounded-xl p-3 border-l-[3px] border-indigo-500">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">AI</span>
                <span className="ml-auto text-[10px] text-slate-600">#{n}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{ann.comment}</p>
            </div>
          )
        })}
        {humanVisible.map((ann, i) => {
          counter++
          const n = counter
          return (
            <div key={ann.id ?? `human-${i}`} className="bg-slate-900 rounded-xl p-3 border-l-[3px] border-emerald-500">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Human</span>
                <span className="ml-auto text-[10px] text-slate-600">#{n}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{ann.comment}</p>
            </div>
          )
        })}
        {total === 0 && (
          <p className="text-xs text-slate-600 text-center mt-8">No annotations yet.</p>
        )}
      </div>

      {/* Add annotation */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onAddAnnotation}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-colors"
        >
          ✏️ Add annotation
        </button>
        <p className="text-center text-[10px] text-slate-600 mt-2">Switch to Annotate mode, then drag on the image</p>
      </div>
    </div>
  )
}
