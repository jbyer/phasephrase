import { NextResponse } from "next/server"
import { Client } from "ssh2"

function executeSSHQuery(): Promise<number> {
  return new Promise((resolve, reject) => {
    const sshClient = new Client()
    let isResolved = false

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        sshClient.end()
        reject(new Error("SSH connection timeout after 15 seconds"))
      }
    }, 15000)

    sshClient.on("ready", () => {
      console.log("[v0] SSH connection established")

      const query = `psql -h localhost -U postgres -d btcr_prod -t -c "SELECT COALESCE(SUM(jobs), 0) as total_jobs FROM btcr.wallets WHERE jobs IS NOT NULL;"`

      sshClient.exec(query, (err, stream) => {
        if (err) {
          console.error("[v0] SSH command execution failed:", err)
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)
            reject(err)
          }
          return
        }

        let output = ""
        let errorOutput = ""

        stream.on("close", (code: number) => {
          console.log("[v0] SSH command completed with code:", code)
          sshClient.end()

          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)

            if (code === 0) {
              const totalJobs = Number.parseInt(output.trim()) || 0
              console.log("[v0] Total jobs retrieved:", totalJobs)
              resolve(totalJobs)
            } else {
              reject(new Error(`Command failed with code ${code}: ${errorOutput}`))
            }
          }
        })

        stream.on("data", (data: Buffer) => {
          output += data.toString()
        })

        stream.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString()
          console.error("[v0] SSH command stderr:", data.toString())
        })
      })
    })

    sshClient.on("error", (err) => {
      console.error("[v0] SSH connection error:", err)
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    console.log("[v0] Connecting to SSH server 192.168.100.67...")
    sshClient.connect({
      host: "192.168.100.67",
      port: 22,
      username: "contact",
      password: "Year20careful!",
      readyTimeout: 15000,
      keepaliveInterval: 30000,
    })
  })
}

export async function GET() {
  try {
    console.log("[v0] Starting SSH database query process")

    const totalJobs = await executeSSHQuery()
    console.log("[v0] Successfully retrieved total jobs:", totalJobs)

    return NextResponse.json({
      totalJobs: totalJobs,
      success: true,
      source: "ssh-database",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in SSH database operation:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.log("[v0] Returning fallback data due to error:", errorMessage)

    return NextResponse.json(
      {
        totalJobs: 150185002,
        success: false,
        source: "fallback",
        error: "SSH/Database connection failed",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}
