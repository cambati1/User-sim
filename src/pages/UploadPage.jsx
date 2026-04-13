import { useState } from 'react'
import DropZone from '../components/DropZone.jsx'
import QuestionChips from '../components/QuestionChips.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import SuccessBanner from '../components/SuccessBanner.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [loadingStep, setLoadingStep] = useState(0)
  const [submissionId, setSubmissionId] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [aiError, setAiError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setFileError('Please select a screenshot.'); return }
    if (!description.trim()) return

    setStatus('loading')
    setLoadingStep(0)
    setSubmitError(null)

    const data = new FormData()
    data.append('screenshot', file)
    data.append('description', description.trim())
    data.append('questions', questions)

    const apiDone = { current: false }
    const animDone = { current: false }
    const pendingId = { current: null }

    function triggerDone() {
      setSubmissionId(pendingId.current)
      setStatus('done')
    }

    const stepTimer = setInterval(() => {
      setLoadingStep(prev => {
        const next = Math.min(prev + 1, 3)
        if (next === 3) {
          if (apiDone.current) {
            clearInterval(stepTimer)
            setTimeout(triggerDone, 600)
          } else {
            animDone.current = true
          }
        }
        return next
      })
    }, 3000)

    try {
      const res = await fetch('/api/submissions', { method: 'POST', body: data })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Upload failed.')
      }

      const { id, aiError: err } = await res.json()
      pendingId.current = id
      if (err) setAiError(err)
      apiDone.current = true

      if (animDone.current) {
        clearInterval(stepTimer)
        setTimeout(triggerDone, 600)
      }

    } catch (err) {
      clearInterval(stepTimer)
      setSubmitError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <LoadingScreen step={loadingStep} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <SuccessBanner submissionId={submissionId} aiError={aiError} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10">
      <nav className="w-full max-w-xl flex items-center justify-center mb-10">
        <div className="bg-foreground rounded-full px-5 py-3 shadow-lg">
          <span className="text-lg font-bold text-primary">design</span>
          <span className="text-lg font-bold text-background">feedback</span>
        </div>
      </nav>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
          Get <em className="not-italic text-primary">real feedback</em><br />on your app's design
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
          Upload a screenshot, get instant AI annotations, share a link for human review.
        </p>
      </div>

      <Card className="w-full max-w-xl overflow-hidden">
        {/* Step tabs */}
        <div className="flex border-b border-border px-6">
          {['Upload', 'Describe', 'Ask'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 py-4 mr-6 border-b-2 border-primary text-primary text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <CardContent className="p-6 flex flex-col gap-6">
          {/* 1. Drop zone */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">Your screenshot</Label>
            <DropZone file={file} onFile={f => { setFile(f); setFileError(null) }} error={fileError} />
          </div>

          {/* 2. Description */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold flex items-center gap-2">
              What screen is this?
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Helps AI</Badge>
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">Give AI context so it gives relevant, not generic, feedback.</p>
            <Input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Onboarding flow for a fitness app, step 2 of 4"
              required
            />
          </div>

          {/* 3. Questions */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">What do you want feedback on?</Label>
            <p className="text-xs text-muted-foreground -mt-1">Write your own, or tap a suggestion to add it.</p>
            <Textarea
              value={questions}
              onChange={e => setQuestions(e.target.value)}
              rows={3}
              placeholder={'Is the CTA obvious enough?\nDoes the visual hierarchy guide the eye?'}
              className="resize-y"
            />
            <QuestionChips value={questions} onChange={setQuestions} />
          </div>

          {/* What happens next */}
          <div className="bg-muted rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">What happens next</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
              <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground">AI annotates your screenshot</strong> — region-by-region feedback in ~10 seconds</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-sm flex-shrink-0">🔗</div>
              <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground">You get a shareable link</strong> — send it to anyone for human annotations on top</p>
            </div>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full font-bold" onClick={handleSubmit}>
            Analyze my design →
          </Button>
          <p className="text-center text-xs text-muted-foreground">Free · no account · your screenshot is private unless you share the link</p>
        </CardContent>
      </Card>
    </div>
  )
}
