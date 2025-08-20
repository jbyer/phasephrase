import { type NextRequest, NextResponse } from "next/server"
import { Client } from "ssh2"

export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json()

    if (!searchTerm || searchTerm.trim() === "") {
      return NextResponse.json({
        success: true,
        passphrases: [],
      })
    }

    console.log("[v0] Starting SSH search for term:", searchTerm)

    const sshClient = new Client()

    const searchResults = await new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        sshClient.end()
        reject(new Error("SSH connection timeout"))
      }, 30000)

      sshClient.on("ready", () => {
        console.log("[v0] SSH connection established for search")
        clearTimeout(timeout)

        // SQL query to search jobs table with confirmed and available filters
        const sqlQuery = `psql -d btcr_prod -t -c "SELECT id, password FROM btcr.jobs WHERE password ILIKE '%${searchTerm.replace(/'/g, "''")}%' AND confirmed = true AND is_available = true LIMIT 100;"`

        sshClient.exec(sqlQuery, (err, stream) => {
          if (err) {
            console.log("[v0] SSH exec error:", err)
            sshClient.end()
            return reject(err)
          }

          let output = ""
          let errorOutput = ""

          stream.on("close", (code: number) => {
            console.log("[v0] SSH command completed with code:", code)
            sshClient.end()

            if (code === 0) {
              // Parse the output into passphrase objects
              const lines = output
                .trim()
                .split("\n")
                .filter((line) => line.trim())
              const passphrases = lines.map((line, index) => {
                const parts = line.trim().split("|")
                const id = parts[0]?.trim()
                const password = parts[1]?.trim()

                return {
                  id: `search-${id || index}`,
                  passphrase: password || line.trim(),
                  description: "Found in database",
                  status: "completed",
                  priority: "Medium",
                  dateAdded: new Date().toISOString().split("T")[0],
                }
              })

              console.log("[v0] Found", passphrases.length, "matching passphrases")
              resolve(passphrases)
            } else {
              console.log("[v0] SSH command failed with error:", errorOutput)
              reject(new Error(`Database query failed: ${errorOutput}`))
            }
          })

          stream.on("data", (data: Buffer) => {
            output += data.toString()
          })

          stream.stderr.on("data", (data: Buffer) => {
            errorOutput += data.toString()
          })
        })
      })

      sshClient.on("error", (err) => {
        console.log("[v0] SSH connection error:", err)
        clearTimeout(timeout)
        reject(err)
      })

      // Connect to SSH server
      sshClient.connect({
        host: "192.168.100.67",
        port: 22,
        username: "contact",
        password: "Year20careful!",
        readyTimeout: 20000,
        keepaliveInterval: 30000,
      })
    })

    return NextResponse.json({
      success: true,
      passphrases: searchResults,
    })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
      passphrases: [],
    })
  }
}
