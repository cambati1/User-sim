import { cn } from '@/lib/utils'

/**
 * Renders a single annotation overlay box absolutely positioned
 * within a relative-positioned parent (the screenshot wrapper).
 *
 * Props:
 *   ann: { id, x, y, width, height, comment, type: 'ai'|'human' }
 *   containerWidth: number   (px width of screenshot)
 *   containerHeight: number  (px height of screenshot)
 *   index: number            (1-based label)
 */
export default function AnnotationBox({ ann, index }) {
  const isAI = ann.type === 'ai'

  const style = {
    position: 'absolute',
    left:   `${ann.x}%`,
    top:    `${ann.y}%`,
    width:  `${ann.width}%`,
    height: `${ann.height}%`,
  }

  const flipLeft = ann.x > 50

  return (
    <div
      style={style}
      className={cn(
        'group rounded-sm cursor-pointer border-2',
        isAI
          ? 'border-primary bg-primary/10'
          : 'border-emerald-500 bg-emerald-500/10',
      )}
    >
      {/* Number badge */}
      <span className={cn(
        'absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md',
        isAI ? 'bg-primary' : 'bg-emerald-500',
      )}>
        {index}
      </span>

      {/* Tooltip */}
      <div className={cn(
        'absolute top-0 z-30 w-52 bg-popover border border-border rounded-xl p-3 shadow-xl',
        'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
        flipLeft ? 'right-full mr-2' : 'left-full ml-2',
      )}>
        <p className={cn(
          'text-[10px] font-bold uppercase tracking-wide mb-1.5',
          isAI ? 'text-primary' : 'text-emerald-600',
        )}>
          {isAI ? '🤖 AI Feedback' : '💬 Human'}
        </p>
        <p className="text-xs text-popover-foreground leading-relaxed">{ann.comment}</p>
      </div>
    </div>
  )
}
