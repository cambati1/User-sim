import { useRef, useEffect, useState } from 'react'
import AnnotationBox from './AnnotationBox.jsx'

/**
 * Props:
 *   screenshotUrl: string
 *   aiAnnotations: Array<{ x, y, width, height, comment }>
 *   humanAnnotations: Array<{ id, x, y, width, height, comment }>
 *   activeTab: 'all' | 'ai' | 'human' | 'none'
 */
export default function AnnotationCanvas({ screenshotUrl, aiAnnotations, humanAnnotations, activeTab }) {
  const imgRef = useRef(null)
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function measure() {
      if (imgRef.current) {
        setImgSize({
          width:  imgRef.current.offsetWidth,
          height: imgRef.current.offsetHeight,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [screenshotUrl])

  const aiAnns    = aiAnnotations.map(a => ({ ...a, type: 'ai' }))
  const humanAnns = humanAnnotations.map(a => ({ ...a, type: 'human' }))

  const visible = activeTab === 'none' ? [] : [
    ...(activeTab !== 'human' ? aiAnns : []),
    ...(activeTab !== 'ai' ? humanAnns : []),
  ]

  return (
    <div className="relative rounded-xl shadow-2xl overflow-visible" style={{ lineHeight: 0 }}>
      <img
        ref={imgRef}
        src={screenshotUrl}
        alt="App screenshot"
        className="block rounded-xl"
        style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 10rem)' }}
        onLoad={() => {
          if (imgRef.current) {
            setImgSize({ width: imgRef.current.offsetWidth, height: imgRef.current.offsetHeight })
          }
        }}
      />
      {imgSize.width > 0 && visible.map((ann, i) => (
        <AnnotationBox
          key={ann.id ?? `ai-${i}`}
          ann={ann}
          containerWidth={imgSize.width}
          containerHeight={imgSize.height}
          index={i + 1}
        />
      ))}
    </div>
  )
}
