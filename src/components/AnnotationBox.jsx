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
export default function AnnotationBox({ ann, containerWidth, containerHeight, index }) {
  const isAI = ann.type === 'ai'

  const style = {
    position: 'absolute',
    left:   `${ann.x}%`,
    top:    `${ann.y}%`,
    width:  `${ann.width}%`,
    height: `${ann.height}%`,
  }

  // Flip tooltip to left side if the annotation is in the right half of the image
  const flipLeft = ann.x > 50

  return (
    <div
      style={style}
      className={[
        'group rounded-sm cursor-pointer',
        isAI
          ? 'border-2 border-indigo-400 bg-indigo-400/10'
          : 'border-2 border-emerald-400 bg-emerald-400/10',
      ].join(' ')}
    >
      {/* Number badge */}
      <span className={[
        'absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md',
        isAI ? 'bg-indigo-500' : 'bg-emerald-500',
      ].join(' ')}>
        {index}
      </span>

      {/* Tooltip */}
      <div className={[
        'absolute top-0 z-30 w-52 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl',
        'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
        flipLeft ? 'right-full mr-2' : 'left-full ml-2',
      ].join(' ')}>
        <p className={[
          'text-[10px] font-bold uppercase tracking-wide mb-1.5',
          isAI ? 'text-indigo-400' : 'text-emerald-400',
        ].join(' ')}>
          {isAI ? '🤖 AI Feedback' : '💬 Human'}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">{ann.comment}</p>
      </div>
    </div>
  )
}
