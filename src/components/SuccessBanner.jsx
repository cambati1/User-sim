import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Props:
 *   submissionId: string
 */
export default function SuccessBanner({ submissionId }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}/review/${submissionId}`

  function copy() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-200 bg-indigo-50">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-base">✓</div>
          <div>
            <p className="text-base font-bold text-white">Your feedback link is ready</p>
            <p className="text-xs text-indigo-400 mt-0.5">AI annotations generated · share with anyone</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-950 rounded-xl px-4 py-3 border border-indigo-700">
          <span className="flex-1 text-xs font-mono text-indigo-300 truncate">{shareUrl}</span>
          <button
            onClick={copy}
            className="px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-lg flex-shrink-0 hover:bg-indigo-400 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-indigo-500">🔒 Only people with this link can see your screenshot</p>
      </div>
      <button
        onClick={() => navigate(`/review/${submissionId}`)}
        className="w-full py-3.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 transition-colors"
      >
        View AI feedback &amp; invite reviewers →
      </button>
    </div>
  )
}
