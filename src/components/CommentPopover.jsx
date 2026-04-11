import { useState } from 'react'

/**
 * Props:
 *   onSave: (comment: string) => void
 *   onCancel: () => void
 */
export default function CommentPopover({ onSave, onCancel }) {
  const [comment, setComment] = useState('')

  function handleSave() {
    const trimmed = comment.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div className="absolute z-40 top-0 left-full ml-3 w-64 bg-slate-800 border border-slate-600 rounded-2xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-white mb-0.5">Add your annotation</p>
      <p className="text-xs text-slate-500 mb-3">What's your feedback on this region?</p>
      <textarea
        autoFocus
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave() }}
        rows={4}
        placeholder="Your comment…"
        className="w-full px-3 py-2.5 bg-slate-900 border border-indigo-500 ring-2 ring-indigo-500/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Save annotation
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-slate-600 text-slate-400 text-xs rounded-xl hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
