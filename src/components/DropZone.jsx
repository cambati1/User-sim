import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Props:
 *   file: File | null
 *   onFile: (file: File) => void
 *   error: string | null
 */
export default function DropZone({ file, onFile, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(f) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) return
    if (f.size > MAX_BYTES) return
    onFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onClick={() => !file && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border-2 border-dashed transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
        file ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {file ? (
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
            🖼️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB · ready</p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current.click() }}
              className="text-xs text-primary font-medium mt-1 hover:underline"
            >
              Change file
            </button>
          </div>
          <span className="text-green-500 text-xl">✓</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-9 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-1">
            🖼️
          </div>
          <p className="text-sm font-semibold text-foreground">Drop your screenshot here</p>
          <p className="text-xs text-muted-foreground">PNG, JPG or WebP · max 10 MB</p>
          <Button type="button" size="sm" className="mt-3" onClick={e => { e.stopPropagation(); inputRef.current.click() }}>
            Browse files
          </Button>
        </div>
      )}

      {error && <p className="px-5 pb-3 text-xs text-destructive">{error}</p>}
    </div>
  )
}
