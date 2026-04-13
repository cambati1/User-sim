import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

/**
 * Calls Gemini with a screenshot (as base64) + context and returns
 * an array of annotation objects: { x, y, width, height, comment }
 * where x/y/width/height are percentages (0-100) of image dimensions.
 * Returns [] on any failure.
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType: mediaType, data: base64Image } },
        { text: prompt },
      ],
    })

    let text = response.text.trim()

    // Strip markdown fences if the model wraps the JSON
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) text = fenceMatch[1].trim()

    let annotations = JSON.parse(text)

    // Validate shape
    if (!Array.isArray(annotations)) return []
    annotations = annotations.filter(a =>
      typeof a.x === 'number' && typeof a.y === 'number' &&
      typeof a.width === 'number' && typeof a.height === 'number' &&
      typeof a.comment === 'string'
    )

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
  } catch (err) {
    console.error('[AI] analyzeScreenshot failed:', err?.message ?? err)
    return []
  }
}
