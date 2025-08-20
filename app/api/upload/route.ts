import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import OpenAI from "openai"

const UPLOAD_DIR = path.join(process.cwd(), "uploaded")
const OUTPUT_DIR = path.join(process.cwd(), "generated")
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
const allowedExtensions = [".csv", ".txt", ".xls", ".xlsx"]

interface LLMConfig {
  provider: "openai"
  apiKey: string
  model: string
  temperature: number
  minWords: number
  maxWords: number
  phrasesPerRow: number
}

async function generatePhraseVariations(
  originalPhrase: string,
  config: LLMConfig,
  seedWords?: string[],
): Promise<string[]> {
  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
    })

    const seedWordsPrompt =
      seedWords && seedWords.length > 0 ? `Incorporate these seed words when possible: ${seedWords.join(", ")}. ` : ""

    const prompt = `Generate ${config.phrasesPerRow} variations of the following passphrase: "${originalPhrase}"

${seedWordsPrompt}Requirements:
- Each variation should be ${config.minWords}-${config.maxWords} words long
- Maintain similar meaning but use different words/phrasing
- Make variations suitable for password/passphrase use
- Return only the variations, one per line
- No numbering, bullets, or extra formatting
- Remove any quotation marks or special characters`

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates passphrase variations for security purposes. Generate clean, usable passphrases without formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: config.temperature,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || ""
    const variations = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[\d\-.)\]*+]+\s*/, "")) // Remove numbering
      .map((line) => line.replace(/["""'']/g, "")) // Remove quotes
      .filter((line) => {
        const wordCount = line.split(/\s+/).length
        return wordCount >= config.minWords && wordCount <= config.maxWords
      })
      .slice(0, config.phrasesPerRow)

    return variations
  } catch (error) {
    console.error("Error generating phrase variations:", error)
    return []
  }
}

function parseCSVContent(content: string): Array<{ phrase: string; description?: string }> {
  const lines = content.split("\n").filter((line) => line.trim())
  const phrases: Array<{ phrase: string; description?: string }> = []

  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes("passphrase") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line) {
      const parts = line.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
      phrases.push({
        phrase: parts[0] || line,
        description: parts[1] || "Imported from file",
      })
    }
  }

  return phrases
}

async function saveGeneratedPhrasesToCSV(
  originalPhrase: string,
  variations: string[],
  outputDir: string,
  timestamp: number,
): Promise<string> {
  const filename = `generated_${timestamp}_${originalPhrase.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}.csv`
  const filepath = path.join(outputDir, filename)

  const csvContent = [
    "phrase,description,type,timestamp",
    `"${originalPhrase}","Original phrase","original","${new Date().toISOString()}"`,
    ...variations.map(
      (variation) =>
        `"${variation}","Generated variation of: ${originalPhrase}","generated","${new Date().toISOString()}"`,
    ),
  ].join("\n")

  await writeFile(filepath, csvContent)
  return filename
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const generateVariations = formData.get("generateVariations") === "true"

    const llmConfig: LLMConfig = {
      provider: "openai",
      apiKey:
        (formData.get("apiKey") as string) ||
        process.env.OPENAI_API_KEY ||
        "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",
      model: (formData.get("model") as string) || "gpt-3.5-turbo",
      temperature: Number.parseFloat(formData.get("temperature") as string) || 0.7,
      minWords: Number.parseInt(formData.get("minWords") as string) || 3,
      maxWords: Number.parseInt(formData.get("maxWords") as string) || 8,
      phrasesPerRow: Number.parseInt(formData.get("phrasesPerRow") as string) || 3,
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Validate file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

    if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV, TXT, and Excel files are allowed." },
        { status: 400 },
      )
    }

    // Create directories if they don't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${timestamp}_${sanitizedName}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    let processedCount = 0
    const generatedFiles: string[] = []

    if (generateVariations && llmConfig.apiKey) {
      try {
        const fileContent = buffer.toString("utf-8")
        let phrases: Array<{ phrase: string; description?: string }> = []

        // Parse file based on extension
        if (fileExtension === ".csv") {
          phrases = parseCSVContent(fileContent)
        } else if (fileExtension === ".txt") {
          const lines = fileContent.split("\n").filter((line) => line.trim())
          phrases = lines.map((line) => ({
            phrase: line.trim(),
            description: "Imported from TXT file",
          }))
        }

        // Generate variations for each phrase
        for (const phraseData of phrases) {
          const variations = await generatePhraseVariations(phraseData.phrase, llmConfig)

          if (variations.length > 0) {
            const generatedFile = await saveGeneratedPhrasesToCSV(
              phraseData.phrase,
              variations,
              OUTPUT_DIR,
              timestamp + processedCount,
            )
            generatedFiles.push(generatedFile)
            processedCount += variations.length + 1 // +1 for original
          }
        }

        if (generatedFiles.length > 0) {
          const mergedContent = ["phrase,description,type,timestamp"]

          for (const generatedFile of generatedFiles) {
            const filePath = path.join(OUTPUT_DIR, generatedFile)
            const content = await readFile(filePath, "utf-8")
            const lines = content.split("\n").slice(1) // Skip header
            mergedContent.push(...lines.filter((line) => line.trim()))
          }

          const mergedFilename = `full-run-merge_${timestamp}.csv`
          const mergedFilepath = path.join(OUTPUT_DIR, mergedFilename)
          await writeFile(mergedFilepath, mergedContent.join("\n"))

          generatedFiles.push(mergedFilename)
        }
      } catch (error) {
        console.error("Error generating variations:", error)
        // Continue with basic file upload even if generation fails
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: generateVariations
        ? `File uploaded and ${processedCount} phrase variations generated successfully`
        : "File uploaded successfully",
      filename: filename,
      originalName: file.name,
      size: file.size,
      uploadPath: filepath,
      processedCount: processedCount || 1,
      generatedFiles: generatedFiles,
      variationsGenerated: generateVariations && processedCount > 0,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
