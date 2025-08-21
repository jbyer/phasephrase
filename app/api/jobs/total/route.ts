import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Starting total jobs API request")

    // Check if SSH2 is available
    let Client
    try {
      const ssh2 = await import("ssh2")
      Client = ssh2.Client
      console.log("SSH2 library loaded successfully")
    } catch (importError) {
      console.error("Failed to import SSH2 library:", importError)
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
    console.log("Successfully retrieved total jobs:", totalJobs)

    return NextResponse.json({
      totalJobs: totalJobs,
      success: true,
      source: "ssh-database",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unhandled error in jobs/total API:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.log("Returning fallback data due to error:", errorMessage)

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
      console.log("SSH client created successfully")
    } catch (clientError) {
      console.error("Failed to create SSH client:", clientError)
      reject(new Error(`SSH client creation failed: ${clientError}`))
      return
    }

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        console.log("SSH operation timed out")
        try {
          sshClient?.end()
        } catch (e) {
          console.error("Error ending SSH client on timeout:", e)
        }
        reject(new Error("SSH connection timeout after 15 seconds"))
      }
    }, 15000)

    sshClient.on("ready", () => {
      console.log("SSH connection established")

      const query = `psql -h localhost -U postgres -d btcr_prod -t -c "SELECT COALESCE(SUM(jobs), 0) as total_jobs FROM btcr.wallets WHERE jobs IS NOT NULL;"`

      sshClient.exec(query, (err, stream) => {
        if (err) {
          console.error("SSH command execution failed:", err)
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
          console.log("SSH command completed with code:", code)
          try {
            sshClient.end()
          } catch (e) {
            console.error("Error ending SSH client:", e)
          }

          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)

            if (code === 0) {
              const totalJobs = Number.parseInt(output.trim()) || 0
              console.log("Total jobs retrieved:", totalJobs)
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
          console.error("SSH command stderr:", data.toString())
        })
      })
    })

    sshClient.on("error", (err) => {
      console.error("SSH connection error:", err)
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(new Error(`SSH connection failed: ${err.message}`))
      }
    })

    try {
      console.log("Connecting to SSH server 192.168.100.67...")
      sshClient.connect({
        host: "192.168.100.67",
        port: 22,
        username: "contact",
        password: "Year20careful!",
        readyTimeout: 15000,
        keepaliveInterval: 30000,
      })
    } catch (connectError) {
      console.error("SSH connect call failed:", connectError)
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(new Error(`SSH connect failed: ${connectError}`))
      }
    }
  })
}
