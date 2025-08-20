import { type NextRequest, NextResponse } from "next/server"
import { Client } from "ssh2"

export async function POST(request: NextRequest) {
  let requestBody

  try {
    requestBody = await request.json()
  } catch (parseError) {
    console.error("[v0] Failed to parse request JSON:", parseError)
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request format",
        passphrases: [],
        hasMore: false,
      },
      { status: 400 },
    )
  }

  try {
    const { searchTerm, offset = 0 } = requestBody

    if (!searchTerm || searchTerm.trim() === "") {
      return NextResponse.json({
        success: true,
        passphrases: [],
        hasMore: false,
      })
    }

    console.log("[v0] Starting SSH search for term:", searchTerm, "offset:", offset)

    const sshClient = new Client()

    const searchResults = await new Promise<{ passphrases: any[]; hasMore: boolean }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        sshClient.end()
        reject(new Error("SSH connection timeout"))
      }, 30000)

      sshClient.on("ready", () => {
        console.log("[v0] SSH connection established for search")
        clearTimeout(timeout)

        const escapedSearchTerm = searchTerm.replace(/'/g, "''").replace(/\\/g, "\\\\")
        const sqlQuery = `psql -d btcr_prod -t -c "SELECT id, password FROM btcr.jobs WHERE password ILIKE '%${escapedSearchTerm}%' AND confirmed = true AND is_available = true LIMIT 201 OFFSET ${offset};"`

        sshClient.exec(sqlQuery, (err, stream) => {
          if (err) {
            console.log("[v0] SSH exec error:", err)
            sshClient.end()
            return reject(new Error(`SSH execution failed: ${err.message}`))
          }

          let output = ""
          let errorOutput = ""

          stream.on("close", (code: number) => {
            console.log("[v0] SSH command completed with code:", code)
            sshClient.end()

            if (code === 0) {
              try {
                // Parse the output into passphrase objects
                const lines = output
                  .trim()
                  .split("\n")
                  .filter((line) => line.trim())

                const hasMore = lines.length > 200
                const passphrases = lines.slice(0, 200).map((line, index) => {
                  const parts = line.trim().split("|")
                  const id = parts[0]?.trim()
                  const password = parts[1]?.trim()

                  return {
                    id: `search-${id || offset + index}`,
                    passphrase: password || line.trim(),
                    description: "Found in database",
                    status: "completed",
                    priority: "Medium",
                    dateAdded: new Date().toISOString().split("T")[0],
                  }
                })

                console.log("[v0] Found", passphrases.length, "matching passphrases, hasMore:", hasMore)
                resolve({ passphrases, hasMore })
              } catch (parseError) {
                console.log("[v0] Error parsing database results:", parseError)
                reject(
                  new Error(
                    `Failed to parse database results: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
                  ),
                )
              }
            } else {
              console.log("[v0] SSH command failed with error:", errorOutput)
              reject(new Error(`Database query failed with code ${code}: ${errorOutput || "Unknown database error"}`))
            }
          })

          stream.on("data", (data: Buffer) => {
            output += data.toString()
          })

          stream.stderr.on("data", (data: Buffer) => {
            errorOutput += data.toString()
          })

          stream.on("error", (streamError) => {
            console.log("[v0] Stream error:", streamError)
            sshClient.end()
            reject(new Error(`Stream error: ${streamError.message}`))
          })
        })
      })

      sshClient.on("error", (err) => {
        console.log("[v0] SSH connection error:", err)
        clearTimeout(timeout)
        reject(new Error(`SSH connection failed: ${err.message}`))
      })

      try {
        sshClient.connect({
          host: "192.168.100.67",
          port: 22,
          username: "contact",
          password: "Year20careful!",
          readyTimeout: 20000,
          keepaliveInterval: 30000,
        })
      } catch (connectError) {
        clearTimeout(timeout)
        reject(
          new Error(
            `Failed to initiate SSH connection: ${connectError instanceof Error ? connectError.message : "Unknown error"}`,
          ),
        )
      }
    })

    return NextResponse.json({
      success: true,
      passphrases: searchResults.passphrases,
      hasMore: searchResults.hasMore,
    })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Search operation failed",
        passphrases: [],
        hasMore: false,
      },
      { status: 500 },
    )
  }
}
