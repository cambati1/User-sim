import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function is503(err) {
  const msg = err?.message ?? ''
  try {
    const parsed = JSON.parse(msg)
    return parsed?.error?.code === 503
  } catch {
    return msg.includes('503') || msg.includes('UNAVAILABLE')
  }
}

async function withRetry(fn, retries = 3, baseDelayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (is503(err) && attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.warn(`[AI] 503 on attempt ${attempt + 1}, retrying in ${delay}ms…`)
        await sleep(delay)
        continue
      }
      throw err
    }
  }
}

/**
 * Calls Gemini with a screenshot (as base64) + context and returns
 * an array of annotation objects: { x, y, width, height, comment }
 * where x/y/width/height are percentages (0-100) of image dimensions.
 * Throws on failure (caller decides whether to surface the error).
 */
export async function analyzeScreenshot({ base64Image, mediaType, description, questions, imageDims }) {
  const questionsText = questions.length
    ? `\nThe uploader specifically wants feedback on:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const usePixels = imageDims && imageDims.width > 0 && imageDims.height > 0
  const coordInstructions = usePixels
    ? `The image is exactly ${imageDims.width} × ${imageDims.height} pixels.

Return pixel coordinates for each annotation box:

[
  {
    "x": <integer pixels from the LEFT edge of the image>,
    "y": <integer pixels from the TOP edge of the image>,
    "width": <integer pixel width of the box>,
    "height": <integer pixel height of the box>,
    "comment": "<specific, actionable feedback for this region>"
  }
]

CRITICAL — measure from the EDGE OF THE FULL IMAGE (not from any card, panel, or content area):
- x=0 is the leftmost pixel of the image; x=${imageDims.width} is the rightmost
- y=0 is the topmost pixel; y=${imageDims.height} is the bottommost
- An element in the center of the screen has x ≈ ${Math.round(imageDims.width / 2)}`
    : `Return percentage coordinates (0–100) relative to the full image:

[
  {
    "x": <number 0-100, left edge as % of image width>,
    "y": <number 0-100, top edge as % of image height>,
    "width": <number 0-100, box width as % of image width>,
    "height": <number 0-100, box height as % of image height>,
    "comment": "<specific, actionable feedback for this region>"
  }
]`

  const prompt = `You are a UX and visual design expert. Analyze this app screenshot and provide specific, actionable design feedback.

Context: ${description}${questionsText}

${coordInstructions}

Rules:
- Return ONLY the JSON array, no markdown fences, no explanation
- Provide 3-6 annotations
- Each box must tightly wrap the specific UI element it discusses
- Comments must be specific (not "improve contrast" but "text contrast ratio is too low — use #1e293b on white instead of #94a3b8")`

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType: mediaType, data: base64Image } },
        { text: prompt },
      ],
    })
  )

  let text = response.text.trim()

  // Strip markdown fences if the model wraps the JSON
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) text = fenceMatch[1].trim()

  let annotations = JSON.parse(text)

  if (!Array.isArray(annotations)) {
    throw new Error(`AI returned unexpected format (${typeof annotations}) instead of an array.`)
  }
  annotations = annotations.filter(a =>
    typeof a.x === 'number' && typeof a.y === 'number' &&
    typeof a.width === 'number' && typeof a.height === 'number' &&
    typeof a.comment === 'string'
  )
  if (annotations.length === 0) {
    throw new Error('AI returned no usable annotations.')
  }

  // Convert pixel coords → percentages when dimensions were provided
  if (usePixels) {
    annotations = annotations.map(a => ({
      ...a,
      x:      parseFloat(((a.x      / imageDims.width)  * 100).toFixed(2)),
      y:      parseFloat(((a.y      / imageDims.height) * 100).toFixed(2)),
      width:  parseFloat(((a.width  / imageDims.width)  * 100).toFixed(2)),
      height: parseFloat(((a.height / imageDims.height) * 100).toFixed(2)),
    }))
  }

  return annotations
}
