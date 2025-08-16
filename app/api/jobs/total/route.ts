import { NextResponse } from "next/server"
import { Pool } from "pg"
import { Client } from "ssh2"

const pool: Pool | null = null

function createSSHTunnel(): Promise<{ pool: Pool; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const sshClient = new Client()

    sshClient.on("ready", () => {
      console.log("[v0] SSH connection established")

      // Create SSH tunnel to PostgreSQL port (assuming default 5432)
      sshClient.forwardOut("127.0.0.1", 0, "127.0.0.1", 5432, (err, stream) => {
        if (err) {
          console.error("[v0] SSH tunnel error:", err)
          reject(err)
          return
        }

        console.log("[v0] SSH tunnel created successfully")

        // Create PostgreSQL connection through SSH tunnel
        const tunnelPool = new Pool({
          host: "127.0.0.1",
          port: 5432,
          database: "btcr_prod",
          user: "contact", // Using SSH username for database connection
          password: "Year20careful!", // Using SSH password for database connection
          stream: stream,
        })

        const cleanup = () => {
          tunnelPool.end()
          sshClient.end()
        }

        resolve({ pool: tunnelPool, cleanup })
      })
    })

    sshClient.on("error", (err) => {
      console.error("[v0] SSH connection error:", err)
      reject(err)
    })

    sshClient.connect({
      host: "192.168.100.67",
      port: 22,
      username: "contact",
      password: "Year20careful!",
    })
  })
}

export async function GET() {
  let cleanup: (() => void) | null = null

  try {
    console.log("[v0] Establishing SSH connection to database")

    const { pool: sshPool, cleanup: sshCleanup } = await createSSHTunnel()
    cleanup = sshCleanup

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
    })
  } catch (error) {
    console.error("[v0] Error fetching total jobs via SSH:", error)

    // Clean up SSH connection on error
    if (cleanup) {
      cleanup()
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown SSH/database error"

    return NextResponse.json(
      {
        error: "Failed to fetch total jobs via SSH",
        details: errorMessage,
        success: false,
        totalJobs: 0, // Provide fallback value
      },
      { status: 500 },
    )
  }
}
