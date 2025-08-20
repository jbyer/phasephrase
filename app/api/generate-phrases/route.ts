import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phrase, apiKey, wordCount = 5, temperature = 0.7, maxVariations = 5 } = await request.json()

    if (!phrase) {
      return NextResponse.json({ success: false, error: "Phrase is required" }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a passphrase variation generator. Generate ${maxVariations} creative variations of the given passphrase. Each variation should be approximately ${wordCount} words long and maintain similar meaning or theme. Return only the variations, one per line, without numbering or additional text.`,
          },
          {
            role: "user",
            content: `Generate ${maxVariations} variations of this passphrase: "${phrase}"`,
          },
        ],
        temperature: temperature,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const variations = data.choices[0].message.content
      .split("\n")
      .filter((line: string) => line.trim())
      .slice(0, maxVariations)

    return NextResponse.json({
      success: true,
      variations,
      originalPhrase: phrase,
    })
  } catch (error) {
    console.error("Error generating phrase variations:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate variations",
      },
      { status: 500 },
    )
  }
}
