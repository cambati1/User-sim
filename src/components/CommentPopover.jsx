import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
    <div className="absolute z-40 top-0 left-full ml-3 w-64 bg-card border border-border rounded-2xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-card-foreground mb-0.5">Add your annotation</p>
      <p className="text-xs text-muted-foreground mb-3">What's your feedback on this region?</p>
      <Textarea
        autoFocus
        value={comment}
        onChange={e => setComment(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave() }}
        rows={4}
        placeholder="Your comment…"
        className="text-xs resize-none"
      />
      <div className="flex gap-2 mt-3">
        <Button
          onClick={handleSave}
          size="sm"
          className="flex-1 text-xs"
        >
          Save annotation
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
