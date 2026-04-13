import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Props:
 *   submissionId: string
 *   aiError: string | null
 */
export default function SuccessBanner({ submissionId, aiError: initialAiError }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [aiError, setAiError] = useState(initialAiError)
  const [retrying, setRetrying] = useState(false)
  const shareUrl = `${window.location.origin}/review/${submissionId}`

  function copy() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function retry() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/retry-ai`, { method: 'POST' })
      const data = await res.json()
      if (data.aiError) {
        setAiError(data.aiError)
      } else {
        setAiError(null)
        navigate(`/review/${submissionId}`)
      }
    } catch {
      setAiError('Something went wrong. Please try again.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {aiError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-2">
            <span><strong>AI annotations couldn't be generated.</strong> {aiError}</span>
            <Button
              size="sm"
              variant="outline"
              className="self-start border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={retry}
              disabled={retrying}
            >
              {retrying ? 'Retrying…' : 'Retry AI annotation'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-base text-primary-foreground">✓</div>
            <div>
              <p className="text-base font-bold text-primary-foreground">Your feedback link is ready</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                {aiError ? 'Share with anyone for human review' : 'AI annotations generated · share with anyone'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/20 rounded-xl px-4 py-3 border border-primary-foreground/20">
            <span className="flex-1 text-xs font-mono text-primary-foreground/80 truncate">{shareUrl}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={copy}
              className="flex-shrink-0 text-xs font-bold"
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-primary-foreground/60">🔒 Only people with this link can see your screenshot</p>
        </div>
        <Separator />
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={() => navigate(`/review/${submissionId}`)}
            className="w-full rounded-none py-4 text-sm font-semibold text-primary hover:text-primary hover:bg-primary/5"
          >
            View feedback &amp; invite reviewers →
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
