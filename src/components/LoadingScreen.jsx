import { cn } from '@/lib/utils'

const STEPS = [
  'Screenshot uploaded',
  'AI reading your design…',
  'Generating annotations',
  'Creating your share link',
]

/**
 * Props:
 *   step: number  (0-3, current active step index)
 */
export default function LoadingScreen({ step }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      <p className="text-lg font-bold text-foreground">Analyzing your design…</p>
      <p className="text-sm text-muted-foreground">This usually takes 5–10 seconds</p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                done   ? 'bg-green-100 text-green-600' :
                active ? 'bg-primary/10 text-primary animate-pulse' :
                         'bg-muted text-muted-foreground',
              )}>
                {done ? '✓' : i + 1}
              </div>
              <span className={cn(
                done   ? 'text-muted-foreground' :
                active ? 'text-foreground font-semibold' :
                         'text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
