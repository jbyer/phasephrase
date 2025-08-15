import { NextResponse } from "next/server"
import { Pool } from "pg"

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

export async function GET() {
  try {
    const dbPool = getPool()

    // Query to get total jobs from wallets table
    const result = await dbPool.query("SELECT SUM(jobs) as total_jobs FROM btcr.wallets")

    const totalJobs = result.rows[0]?.total_jobs || 0

    return NextResponse.json({
      totalJobs: Number.parseInt(totalJobs.toString()),
      success: true,
    })
  } catch (error) {
    console.error("Error fetching total jobs:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown database error"

    return NextResponse.json(
      {
        error: "Failed to fetch total jobs",
        details: errorMessage,
        success: false,
        totalJobs: 0, // Provide fallback value
      },
      { status: 500 },
    )
  }
}
