import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

/**
 * Calls Gemini with a screenshot (as base64) + context and returns
 * an array of annotation objects: { x, y, width, height, comment }
 * where x/y/width/height are percentages (0-100) of image dimensions.
 * Returns [] on any failure.
 */
export async function analyzeScreenshot({ base64Image, mediaType, description, questions }) {
  const questionsText = questions.length
    ? `\nThe uploader specifically wants feedback on:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const prompt = `You are a UX and visual design expert. Analyze this app screenshot and provide specific, actionable design feedback.

Context: ${description}${questionsText}

Return a JSON array of annotation objects. Each annotation must cover a specific region of the screenshot and explain what could be improved. Use this exact format:

[
  {
    "x": <number 0-100, left edge as % of image width>,
    "y": <number 0-100, top edge as % of image height>,
    "width": <number 0-100, box width as % of image width>,
    "height": <number 0-100, box height as % of image height>,
    "comment": "<specific, actionable feedback for this region>"
  }
]

Rules:
- Return ONLY the JSON array, no markdown fences, no explanation
- Provide 3-6 annotations
- Each box must tightly wrap the element it discusses
- Comments must be specific (not "improve contrast" but "text contrast ratio is too low — use #1e293b on white instead of #94a3b8")
- Coordinates must be accurate to the actual element positions in the image`

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

    const annotations = JSON.parse(text)

    // Validate shape
    if (!Array.isArray(annotations)) return []
    return annotations.filter(a =>
      typeof a.x === 'number' && typeof a.y === 'number' &&
      typeof a.width === 'number' && typeof a.height === 'number' &&
      typeof a.comment === 'string'
    )
  } catch (err) {
    console.error('[AI] analyzeScreenshot failed:', err?.message ?? err)
    return []
  }
}
