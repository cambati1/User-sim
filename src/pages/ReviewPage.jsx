import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import AnnotationSidebar from '../components/AnnotationSidebar.jsx'
import DrawOverlay from '../components/DrawOverlay.jsx'
import CommentPopover from '../components/CommentPopover.jsx'

export default function ReviewPage() {
  const { id } = useParams()
  const [submission, setSubmission] = useState(null)
  const [humanAnnotations, setHumanAnnotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('view') // 'view' | 'annotate' | 'popover'
  const [activeTab, setActiveTab] = useState('all')
  const [pendingBox, setPendingBox] = useState(null) // { x, y, width, height } in %
  const canvasWrapRef = useRef(null)

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(data => {
        setSubmission(data)
        setHumanAnnotations(data.annotations || [])
        setLoading(false)
      })
      .catch(() => { setError('This link was not found.'); setLoading(false) })
  }, [id])

  async function saveAnnotation(comment) {
    if (!pendingBox) return
    const res = await fetch(`/api/submissions/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pendingBox, comment }),
    })
    if (res.ok) {
      const ann = await res.json()
      setHumanAnnotations(prev => [...prev, ann])
    }
    setPendingBox(null)
    setMode('view')
  }

  function handleDraw(box) {
    setPendingBox(box)
    setMode('popover')
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  if (error)   return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">{error}</div>

  const screenshotUrl = `/uploads/${submission.screenshotPath.replace('uploads/', '')}`

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Topbar */}
      <div className="flex-shrink-0 h-13 bg-slate-800 border-b border-slate-700 px-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-indigo-400">design<span className="text-slate-200">feedback</span></span>
          <span className="w-px h-5 bg-slate-600" />
          <span className="text-sm text-slate-400">
            <strong className="text-slate-200">{submission.description}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400">
            🤖 {submission.aiAnnotations.length} AI
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400">
            💬 {humanAnnotations.length} human
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-400 transition-colors"
          >
            🔗 Copy link
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center overflow-auto bg-slate-900 pt-12 pb-8 px-8 gap-5">
          {/* Mode switcher */}
          <div className="flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => { setMode('view'); setPendingBox(null) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'view' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              👁 View
            </button>
            <button
              onClick={() => setMode('annotate')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'annotate' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ✏️ Annotate
            </button>
          </div>

          {/* Screenshot + overlays */}
          <div ref={canvasWrapRef} className="relative">
            <AnnotationCanvas
              screenshotUrl={screenshotUrl}
              aiAnnotations={submission.aiAnnotations}
              humanAnnotations={humanAnnotations}
              activeTab={mode === 'annotate' ? 'none' : activeTab}
            />

            {mode === 'annotate' && !pendingBox && (
              <DrawOverlay onDraw={handleDraw} />
            )}

            {(mode === 'popover' || pendingBox) && pendingBox && (
              <>
                {/* Show the drawn box */}
                <div
                  className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
                  style={{
                    left: `${pendingBox.x}%`,
                    top: `${pendingBox.y}%`,
                    width: `${pendingBox.width}%`,
                    height: `${pendingBox.height}%`,
                  }}
                />
                {/* Popover anchored to the drawn box */}
                <div
                  className="absolute z-40"
                  style={{
                    left: `${pendingBox.x + pendingBox.width}%`,
                    top: `${pendingBox.y}%`,
                  }}
                >
                  <CommentPopover
                    onSave={saveAnnotation}
                    onCancel={() => { setPendingBox(null); setMode('annotate') }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <AnnotationSidebar
          aiAnnotations={submission.aiAnnotations}
          humanAnnotations={humanAnnotations}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddAnnotation={() => setMode('annotate')}
        />
      </div>
    </div>
  )
}
