import { type NextRequest, NextResponse } from "next/server"

interface GeneratePhraseRequest {
  basePhrase: string
  numVariations?: number
  minWords?: number
  maxWords?: number
  temperature?: number
  useAzure?: boolean
}

interface GeneratedPhrase {
  phrase: string
  description: string
}

// Clean and validate generated phrases
function cleanGeneratedPhrase(phrase: string, minWords: number, maxWords: number): string | null {
  // Remove common LLM response tags and formatting
  let cleaned = phrase
    .replace(/^\d+\.\s*/, "") // Remove numbering
    .replace(/^[-*]\s*/, "") // Remove bullet points
    .replace(/["""'']/g, '"') // Normalize quotes
    .replace(/^\s*["']|["']\s*$/g, "") // Remove surrounding quotes
    .trim()

  // Remove punctuation at the end
  cleaned = cleaned.replace(/[.!?;,]+$/, "")

  // Count words
  const wordCount = cleaned.split(/\s+/).filter((word) => word.length > 0).length

  // Validate word count
  if (wordCount < minWords || wordCount > maxWords) {
    return null
  }

  return cleaned
}

// API call with exponential backoff
async function apiCallWithBackoff(apiCall: () => Promise<any>, maxRetries = 3, baseDelay = 1000): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error

      // Check if it's a rate limit error
      if (error.status === 429 || error.code === "rate_limit_exceeded") {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePhraseRequest = await request.json()
    const { basePhrase, numVariations = 3, minWords = 3, maxWords = 12, temperature = 0.7, useAzure = false } = body

    if (!basePhrase?.trim()) {
      return NextResponse.json({ error: "Base phrase is required" }, { status: 400 })
    }

    const generatedPhrases: GeneratedPhrase[] = []

    // Initialize AI client based on configuration
    let client: any
    let model: string

    if (useAzure && process.env.AZURE_OPENAI_API_KEY) {
      // Azure OpenAI configuration
      const { AzureOpenAI } = await import("openai")
      client = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
      })
      model = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-35-turbo"
    } else if (process.env.OPENAI_API_KEY) {
      // OpenAI configuration
      const { OpenAI } = await import("openai")
      client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      model = "gpt-3.5-turbo"
    } else {
      return NextResponse.json({ error: "No AI API key configured" }, { status: 500 })
    }

    // Generate phrase variations
    for (let i = 0; i < numVariations; i++) {
      try {
        const prompt = `Generate a creative variation of this passphrase: "${basePhrase}"

Requirements:
- Create a similar but different phrase that could be used as a password variation
- Keep it between ${minWords} and ${maxWords} words
- Maintain similar complexity and style
- Do not include quotes, numbering, or explanations
- Return only the phrase itself

Variation ${i + 1}:`

        const completion = await apiCallWithBackoff(async () => {
          return await client.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that generates password phrase variations. Return only the requested phrase without any additional formatting or explanation.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 100,
            temperature,
            top_p: 0.9,
          })
        })

        const generatedText = completion.choices[0]?.message?.content?.trim()

        if (generatedText) {
          const cleanedPhrase = cleanGeneratedPhrase(generatedText, minWords, maxWords)

          if (cleanedPhrase && cleanedPhrase !== basePhrase) {
            generatedPhrases.push({
              phrase: cleanedPhrase,
              description: `AI-generated variation ${i + 1}`,
            })
          }
        }
      } catch (error) {
        console.error(`Error generating variation ${i + 1}:`, error)
        // Continue with other variations even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      basePhrase,
      generatedPhrases,
      totalGenerated: generatedPhrases.length,
    })
  } catch (error) {
    console.error("Error in generate-phrases API:", error)
    return NextResponse.json({ error: "Failed to generate phrase variations" }, { status: 500 })
  }
}
