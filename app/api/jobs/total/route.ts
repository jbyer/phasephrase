import { NextResponse } from "next/server"
import { Pool } from "pg"
import { Client } from "ssh2"

function createSSHTunnel(): Promise<{ pool: Pool; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const sshClient = new Client()
    let isResolved = false

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        sshClient.end()
        reject(new Error("SSH connection timeout after 10 seconds"))
      }
    }, 10000)

    sshClient.on("ready", () => {
      console.log("[v0] SSH connection established")

      sshClient.forwardOut("127.0.0.1", 0, "localhost", 5432, (err, stream) => {
        if (err) {
          console.error("[v0] SSH tunnel error:", err)
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)
            reject(err)
          }
          return
        }

        console.log("[v0] SSH tunnel created successfully")

        const tunnelPool = new Pool({
          host: "localhost",
          port: 5432,
          database: "btcr_prod",
          user: "postgres", // Using proper database user instead of SSH user
          password: process.env.DB_PASSWORD || "Year20careful!", // Allow override via env var
          stream: stream,
          connectionTimeoutMillis: 5000,
          max: 1, // Single connection through SSH tunnel
        })

        const cleanup = () => {
          console.log("[v0] Cleaning up SSH tunnel and database connection")
          tunnelPool.end()
          sshClient.end()
        }

        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)
          resolve({ pool: tunnelPool, cleanup })
        }
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

    console.log("[v0] Connecting to SSH server...")
    sshClient.connect({
      host: "192.168.100.67",
      port: 22,
      username: "contact",
      password: "Year20careful!",
      readyTimeout: 10000, // Added ready timeout
    })
  })
}

export async function GET() {
  let cleanup: (() => void) | null = null

  try {
    console.log("[v0] Establishing SSH connection to database")

    const { pool: sshPool, cleanup: sshCleanup } = await createSSHTunnel()
    cleanup = sshCleanup

    console.log("[v0] Testing database connection through SSH tunnel")

    await sshPool.query("SELECT 1")

    console.log("[v0] Querying btcr.wallets table for job count")

    // Query to get total jobs from wallets table
    const result = await sshPool.query("SELECT SUM(jobs) as total_jobs FROM btcr.wallets")

    const totalJobs = result.rows[0]?.total_jobs || 0

    console.log("[v0] Total jobs retrieved:", totalJobs)

    // Clean up SSH connection
    cleanup()

    return NextResponse.json({
      totalJobs: Number.parseInt(totalJobs.toString()),
      success: true,
      source: "ssh-database",
    })
  } catch (error) {
    console.error("[v0] Error fetching total jobs via SSH:", error)

    // Clean up SSH connection on error
    if (cleanup) {
      cleanup()
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown SSH/database error"

    return NextResponse.json({
      totalJobs: 150185002, // Using realistic fallback based on previous data
      success: false,
      source: "fallback",
      error: "SSH/Database connection failed",
      details: errorMessage,
      message: "Using fallback data - check SSH/database configuration",
    })
  }
}
