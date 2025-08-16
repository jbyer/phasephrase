import { NextResponse } from "next/server"
import { Pool } from "pg"

function createDatabasePool(): Pool | null {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL environment variable not set")
      return null
    }

    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 5, // Limit concurrent connections
    })
  } catch (error) {
    console.error("[v0] Failed to create database pool:", error)
    return null
  }
}

export async function GET() {
  try {
    console.log("[v0] Attempting to fetch active miners count")

    const pool = createDatabasePool()

    if (!pool) {
      console.log("[v0] Database not configured, returning mock data")
      return NextResponse.json({
        activeCount: 10, // Mock data when database unavailable
        workers: [],
        lastUpdated: new Date().toISOString(),
        source: "fallback",
        message: "Database not configured - showing mock data",
      })
    }

    await pool.query("SELECT 1")
    console.log("[v0] Database connection successful")

    // Query to get count of active workers
    const result = await pool.query("SELECT COUNT(*) as active_count FROM btcr.workers WHERE state = $1", ["running"])

    const activeCount = Number.parseInt(result.rows[0].active_count)

    // Also get detailed worker information for additional context
    const workersResult = await pool.query(
      "SELECT id, name, wallet_id, state, heartbeat FROM btcr.workers WHERE state = $1 ORDER BY heartbeat DESC",
      ["running"],
    )

    console.log("[v0] Successfully retrieved", activeCount, "active miners")

    return NextResponse.json({
      activeCount,
      workers: workersResult.rows,
      lastUpdated: new Date().toISOString(),
      source: "database",
    })
  } catch (error) {
    console.error("[v0] Database query error:", error)

    return NextResponse.json({
      activeCount: 10, // Fallback value
      workers: [],
      lastUpdated: new Date().toISOString(),
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown database error",
      message: "Database connection failed - showing fallback data",
    })
  }
}
