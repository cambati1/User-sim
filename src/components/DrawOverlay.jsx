import { useRef, useState } from 'react'

/**
 * Transparent overlay covering the screenshot in Annotate mode.
 * Tracks mousedown → mousemove → mouseup to produce a % bounding box.
 *
 * Props:
 *   onDraw: ({ x, y, width, height }: PercentBox) => void
 *     Called on mouseup with coordinates as % of container dimensions.
 */
export default function DrawOverlay({ onDraw }) {
  const containerRef = useRef(null)
  const [drawing, setDrawing] = useState(null) // { startX, startY, endX, endY } in px relative to container

  function pct(px, dim) { return Math.max(0, Math.min(100, (px / dim) * 100)) }

  function onMouseDown(e) {
    const rect = containerRef.current.getBoundingClientRect()
    setDrawing({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, endX: e.clientX - rect.left, endY: e.clientY - rect.top })
  }

  function onMouseMove(e) {
    if (!drawing) return
    const rect = containerRef.current.getBoundingClientRect()
    setDrawing(d => ({ ...d, endX: e.clientX - rect.left, endY: e.clientY - rect.top }))
  }

  function onMouseUp() {
    if (!drawing) return
    const rect = containerRef.current.getBoundingClientRect()
    const x1 = Math.min(drawing.startX, drawing.endX)
    const y1 = Math.min(drawing.startY, drawing.endY)
    const x2 = Math.max(drawing.startX, drawing.endX)
    const y2 = Math.max(drawing.startY, drawing.endY)
    const w = x2 - x1
    const h = y2 - y1
    setDrawing(null)
    if (w < 10 || h < 10) return // ignore tiny accidental clicks
    onDraw({
      x: pct(x1, rect.width),
      y: pct(y1, rect.height),
      width:  pct(w, rect.width),
      height: pct(h, rect.height),
    })
  }

  const previewBox = drawing ? (() => {
    return {
      left:   Math.min(drawing.startX, drawing.endX),
      top:    Math.min(drawing.startY, drawing.endY),
      width:  Math.abs(drawing.endX - drawing.startX),
      height: Math.abs(drawing.endY - drawing.startY),
    }
  })() : null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair z-20"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {previewBox && (
        <div
          className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/10 rounded-sm pointer-events-none"
          style={{ left: previewBox.left, top: previewBox.top, width: previewBox.width, height: previewBox.height }}
        />
      )}
    </div>
  )
}
