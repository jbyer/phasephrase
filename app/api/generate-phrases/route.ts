import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

interface GeneratePhraseRequest {
  phrase: string
  numVariations?: number
  minWords?: number
  maxWords?: number
  temperature?: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      phrase,
      numVariations = 5,
      minWords = 3,
      maxWords = 12,
      temperature = 0.7,
    }: GeneratePhraseRequest = await request.json()

    if (!phrase?.trim()) {
      return NextResponse.json({ error: "Phrase is required" }, { status: 400 })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT
        ? `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`
        : undefined,
      defaultQuery: process.env.AZURE_OPENAI_API_VERSION
        ? { "api-version": process.env.AZURE_OPENAI_API_VERSION }
        : undefined,
      defaultHeaders: process.env.AZURE_OPENAI_API_KEY ? { "api-key": process.env.AZURE_OPENAI_API_KEY } : undefined,
    })

    const prompt = `Generate ${numVariations} variations of the following passphrase: "${phrase}"

Requirements:
- Each variation should be between ${minWords} and ${maxWords} words
- Maintain similar meaning but use different words/phrasing
- Remove any quotation marks, periods, or special characters
- Each variation should be on a separate line
- Only return the variations, no additional text

Variations:`

    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates passphrase variations. Return only the requested variations, one per line, without any additional formatting or text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: 500,
    })

    const generatedText = completion.choices[0]?.message?.content?.trim()
    if (!generatedText) {
      throw new Error("No response from AI model")
    }

    // Clean and filter generated phrases
    const variations = generatedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Remove numbering, quotes, and special characters
        return line
          .replace(/^\d+\.?\s*/, "")
          .replace(/["""'']/g, "")
          .replace(/[^\w\s]/g, "")
          .trim()
      })
      .filter((line) => {
        const wordCount = line.split(/\s+/).length
        return wordCount >= minWords && wordCount <= maxWords && line.length > 0
      })
      .slice(0, numVariations) // Ensure we don't exceed requested number

    return NextResponse.json({
      original: phrase,
      variations,
      count: variations.length,
    })
  } catch (error) {
    console.error("Error generating phrase variations:", error)
    return NextResponse.json({ error: "Failed to generate phrase variations" }, { status: 500 })
  }
}
