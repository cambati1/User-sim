import { useState } from 'react'
import DropZone from '../components/DropZone.jsx'
import QuestionChips from '../components/QuestionChips.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import SuccessBanner from '../components/SuccessBanner.jsx'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [loadingStep, setLoadingStep] = useState(0)
  const [submissionId, setSubmissionId] = useState(null)
  const [submitError, setSubmitError] = useState(null)

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

    // Coordination latches: whichever side (animation or API) finishes second triggers done
    const apiDone = { current: false }
    const animDone = { current: false }
    const pendingId = { current: null }

    function triggerDone() {
      setSubmissionId(pendingId.current)
      setStatus('done')
    }

    // Always animate through all 4 steps at 3s each, regardless of API speed
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

      const { id } = await res.json()
      pendingId.current = id
      apiDone.current = true

      if (animDone.current) {
        // Animation already at step 3 — both sides done, fire now
        clearInterval(stepTimer)
        setTimeout(triggerDone, 600)
      }
      // else: interval will handle transition when animation reaches step 3

    } catch (err) {
      clearInterval(stepTimer)
      setSubmitError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg p-8">
          <LoadingScreen step={loadingStep} />
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <SuccessBanner submissionId={submissionId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center px-4 py-10">
      <nav className="w-full max-w-xl flex items-center justify-center mb-10">
        <div className="bg-[#191919] rounded-full px-5 py-3 shadow-lg">
          <span className="text-lg font-bold text-[#008cff]">design</span>
          <span className="text-lg font-bold text-white">feedback</span>
        </div>
      </nav>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Get <em className="not-italic text-indigo-500">real feedback</em><br />on your app's design
        </h1>
        <p className="mt-3 text-base text-slate-500 max-w-sm mx-auto">
          Upload a screenshot, get instant AI annotations, share a link for human review.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-xl overflow-hidden">
        {/* Step tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {['Upload', 'Describe', 'Ask'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 py-4 mr-6 border-b-2 border-indigo-500 text-indigo-600 text-xs font-semibold">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* 1. Drop zone */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">Your screenshot</label>
            <DropZone file={file} onFile={f => { setFile(f); setFileError(null) }} error={fileError} />
          </div>

          {/* 2. Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              What screen is this?
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Helps AI</span>
            </label>
            <p className="text-xs text-slate-400 -mt-1">Give AI context so it gives relevant, not generic, feedback.</p>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Onboarding flow for a fitness app, step 2 of 4"
              required
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* 3. Questions */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">What do you want feedback on?</label>
            <p className="text-xs text-slate-400 -mt-1">Write your own, or tap a suggestion to add it.</p>
            <textarea
              value={questions}
              onChange={e => setQuestions(e.target.value)}
              rows={3}
              placeholder={'Is the CTA obvious enough?\nDoes the visual hierarchy guide the eye?'}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y"
            />
            <QuestionChips value={questions} onChange={setQuestions} />
          </div>

          {/* What happens next */}
          <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">What happens next</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
              <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">AI annotates your screenshot</strong> — region-by-region feedback in ~10 seconds</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-sm flex-shrink-0">🔗</div>
              <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">You get a shareable link</strong> — send it to anyone for human annotations on top</p>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Analyze my design →
          </button>
          <p className="text-center text-xs text-slate-400">Free · no account · your screenshot is private unless you share the link</p>
        </form>
      </div>
    </div>
  )
}
