import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Starting total jobs API request")

    // Check if SSH2 is available
    let Client
    try {
      const ssh2 = await import("ssh2")
      Client = ssh2.Client
      console.log("[v0] SSH2 library loaded successfully")
    } catch (importError) {
      console.error("[v0] Failed to import SSH2 library:", importError)
      return NextResponse.json({
        totalJobs: 150185002,
        success: false,
        source: "fallback",
        error: "SSH library not available",
        details: importError instanceof Error ? importError.message : "Import failed",
        timestamp: new Date().toISOString(),
      })
    }

    // Execute SSH query with comprehensive error handling
    const totalJobs = await executeSSHQuery(Client)
    console.log("[v0] Successfully retrieved total jobs:", totalJobs)

    return NextResponse.json({
      totalJobs: totalJobs,
      success: true,
      source: "ssh-database",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Unhandled error in jobs/total API:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.log("[v0] Returning fallback data due to error:", errorMessage)

    return NextResponse.json({
      totalJobs: 150185002,
      success: false,
      source: "fallback",
      error: "API execution failed",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
}

function executeSSHQuery(Client: any): Promise<number> {
  return new Promise((resolve, reject) => {
    let sshClient
    let isResolved = false

    try {
      sshClient = new Client()
      console.log("[v0] SSH client created successfully")
    } catch (clientError) {
      console.error("[v0] Failed to create SSH client:", clientError)
      reject(new Error(`SSH client creation failed: ${clientError}`))
      return
    }

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        console.log("[v0] SSH operation timed out")
        try {
          sshClient?.end()
        } catch (e) {
          console.error("[v0] Error ending SSH client on timeout:", e)
        }
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
            reject(new Error(`SSH command failed: ${err.message}`))
          }
          return
        }

        let output = ""
        let errorOutput = ""

        stream.on("close", (code: number) => {
          console.log("[v0] SSH command completed with code:", code)
          try {
            sshClient.end()
          } catch (e) {
            console.error("[v0] Error ending SSH client:", e)
          }

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

        stream.stderr?.on("data", (data: Buffer) => {
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
        reject(new Error(`SSH connection failed: ${err.message}`))
      }
    })

    try {
      console.log("[v0] Connecting to SSH server 192.168.100.67...")
      sshClient.connect({
        host: "192.168.100.67",
        port: 22,
        username: "contact",
        password: "Year20careful!",
        readyTimeout: 15000,
        keepaliveInterval: 30000,
      })
    } catch (connectError) {
      console.error("[v0] SSH connect call failed:", connectError)
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(new Error(`SSH connect failed: ${connectError}`))
      }
    }
  })
}
