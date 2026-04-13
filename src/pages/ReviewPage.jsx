import { useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import AnnotationSidebar from '../components/AnnotationSidebar.jsx'
import DrawOverlay from '../components/DrawOverlay.jsx'
import CommentPopover from '../components/CommentPopover.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ReviewPage() {
  const { id } = useParams()
  const [submission, setSubmission] = useState(null)
  const [humanAnnotations, setHumanAnnotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aiError, setAiError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [mode, setMode] = useState('view') // 'view' | 'annotate' | 'popover'
  const [activeTab, setActiveTab] = useState('all')
  const [pendingBox, setPendingBox] = useState(null)
  const canvasWrapRef = useRef(null)

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(data => {
        setSubmission(data)
        setHumanAnnotations(data.annotations || [])
        if (data.aiError) setAiError(data.aiError)
        setLoading(false)
      })
      .catch(() => { setError('This link was not found.'); setLoading(false) })
  }, [id])

  async function saveAnnotation(comment) {
    if (!pendingBox) return
    try {
      const res = await fetch(`/api/submissions/${id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingBox, comment }),
      })
      if (res.ok) {
        const ann = await res.json()
        setHumanAnnotations(prev => [...prev, ann])
      }
    } catch {
      // Network error — silently fail
    } finally {
      setPendingBox(null)
      setMode('view')
    }
  }

  async function retryAI() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/submissions/${id}/retry-ai`, { method: 'POST' })
      const data = await res.json()
      if (data.aiError) {
        setAiError(data.aiError)
      } else {
        setAiError(null)
        setSubmission(prev => ({ ...prev, aiAnnotations: data.aiAnnotations }))
      }
    } catch {
      setAiError('Something went wrong. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  function handleDraw(box) {
    setPendingBox(box)
    setMode('popover')
  }

  if (loading) return (
    <div className="min-h-screen bg-background dark flex items-center justify-center text-muted-foreground text-sm">
      Loading…
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-background dark flex items-center justify-center text-muted-foreground text-sm">
      {error}
    </div>
  )

  const screenshotUrl = submission.screenshotPath
    ? `/uploads/${submission.screenshotPath.replace('uploads/', '')}`
    : null

  return (
    <div className="dark flex flex-col h-screen bg-background overflow-hidden">
      {/* Topbar */}
      <div className="flex-shrink-0 h-13 bg-card border-b border-border px-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-base font-bold text-primary">design<span className="text-card-foreground">feedback</span></span>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-card-foreground">{submission.description}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            🤖 {(submission.aiAnnotations ?? []).length} AI
          </Badge>
          <Badge variant="secondary" className="text-xs font-semibold bg-emerald-950 text-emerald-400 border-emerald-800">
            💬 {humanAnnotations.length} human
          </Badge>
          <Button
            size="sm"
            onClick={() => { navigator.clipboard.writeText(window.location.href) }}
          >
            🔗 Copy link
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* AI error banner */}
          {aiError && (
            <Alert variant="destructive" className="mx-4 mt-3 flex-shrink-0">
              <AlertDescription className="flex items-center justify-between gap-4">
                <span><strong>AI annotations couldn't be generated.</strong> {aiError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={retryAI}
                  disabled={retrying}
                >
                  {retrying ? 'Retrying…' : 'Retry'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {/* Mode switcher */}
          <div className="flex-shrink-0 flex justify-center pt-4 pb-3">
            <div className="bg-card border border-border rounded-xl p-1 flex gap-1">
              <Button
                variant={mode === 'view' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setMode('view'); setPendingBox(null) }}
                className="text-xs font-bold"
              >
                👁 View
              </Button>
              <Button
                variant={mode === 'annotate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('annotate')}
                className="text-xs font-bold"
              >
                ✏️ Annotate
              </Button>
            </div>
          </div>

          {/* Screenshot + overlays */}
          <div className="flex-1 flex items-center justify-center overflow-hidden mx-6 mb-6">
            <div ref={canvasWrapRef} className="relative">
              <AnnotationCanvas
                screenshotUrl={screenshotUrl ?? ''}
                aiAnnotations={submission.aiAnnotations ?? []}
                humanAnnotations={humanAnnotations}
                activeTab={mode === 'annotate' ? 'none' : activeTab}
              />

              {mode === 'annotate' && !pendingBox && (
                <DrawOverlay onDraw={handleDraw} />
              )}

              {mode === 'popover' && pendingBox && (
                <>
                  <div
                    className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
                    style={{
                      left: `${pendingBox.x}%`,
                      top: `${pendingBox.y}%`,
                      width: `${pendingBox.width}%`,
                      height: `${pendingBox.height}%`,
                    }}
                  />
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
        </div>

        {/* Sidebar */}
        <AnnotationSidebar
          aiAnnotations={submission.aiAnnotations ?? []}
          humanAnnotations={humanAnnotations}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddAnnotation={() => setMode('annotate')}
        />
      </div>
    </div>
  )
}
