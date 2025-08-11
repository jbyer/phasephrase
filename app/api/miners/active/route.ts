import { NextResponse } from "next/server"
import { Pool } from "pg"

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export async function GET() {
  try {
    // Query to get count of active workers
    const result = await pool.query("SELECT COUNT(*) as active_count FROM btcr.workers WHERE state = $1", ["running"])

    const activeCount = Number.parseInt(result.rows[0].active_count)

    // Also get detailed worker information for additional context
    const workersResult = await pool.query(
      "SELECT id, name, wallet_id, state, heartbeat FROM btcr.workers WHERE state = $1 ORDER BY heartbeat DESC",
      ["running"],
    )

    return NextResponse.json({
      activeCount,
      workers: workersResult.rows,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database query error:", error)
    return NextResponse.json({ error: "Failed to fetch active miners count" }, { status: 500 })
  }
}
