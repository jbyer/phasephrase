import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Starting total jobs API request")

    // Check if we have a direct database connection string or use fallback
    const databaseUrl = process.env.DATABASE_URL
    const fallbackJobCount = process.env.FALLBACK_JOB_COUNT || "150185002"

    if (databaseUrl) {
      console.log("[v0] Attempting direct database connection")
      try {
        // Use direct PostgreSQL connection if DATABASE_URL is available
        const { Pool } = await import("pg")
        const pool = new Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 1,
        })

        const client = await pool.connect()
        const result = await client.query(
          "SELECT COALESCE(SUM(jobs), 0) as total_jobs FROM btcr.wallets WHERE jobs IS NOT NULL",
        )

        const totalJobs = Number.parseInt(result.rows[0]?.total_jobs) || 0
        console.log("[v0] Successfully retrieved total jobs from database:", totalJobs)

        client.release()
        await pool.end()

        return NextResponse.json({
          totalJobs: totalJobs,
          success: true,
          source: "database",
          timestamp: new Date().toISOString(),
        })
      } catch (dbError) {
        console.error("[v0] Database connection failed:", dbError)
        // Fall through to fallback
      }
    }

    const totalJobs = Number.parseInt(fallbackJobCount)
    console.log("[v0] Using fallback job count:", totalJobs)

    return NextResponse.json({
      totalJobs: totalJobs,
      success: true,
      source: "environment-fallback",
      message: "Using configured fallback value. Set DATABASE_URL for live data.",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Unhandled error in jobs/total API:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json({
      totalJobs: 150185002,
      success: false,
      source: "error-fallback",
      error: "API execution failed",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
}
