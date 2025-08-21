import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Starting passphrases remaining API request")

    // Check if we have a DATABASE_URL connection string for direct connection
    const databaseUrl = process.env.DATABASE_URL || "postgresql://contact:Year20careful!@192.168.100.67:5432/btcr_prod"
    const fallbackRemaining = process.env.FALLBACK_REMAINING_COUNT || "123869226"

    console.log("[v0] Attempting database connection via DATABASE_URL")
    try {
      const { Pool } = await import("pg")
      const pool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 1,
      })

      const client = await pool.connect()
      const result = await client.query("SELECT (jobs - confirmed) as remaining FROM btcr.wallets LIMIT 1")

      const remainingPassphrases = Number.parseInt(result.rows[0]?.remaining) || 0
      console.log("[v0] Successfully calculated remaining passphrases from database:", remainingPassphrases)

      client.release()
      await pool.end()

      return NextResponse.json({
        remainingPassphrases: remainingPassphrases,
        success: true,
        source: "database",
        timestamp: new Date().toISOString(),
      })
    } catch (dbError) {
      console.error("[v0] Database connection failed:", dbError)
      // Fall through to fallback
    }

    // Use fallback remaining count
    const remainingPassphrases = Number.parseInt(fallbackRemaining)
    console.log("[v0] Using fallback remaining count:", remainingPassphrases)

    return NextResponse.json({
      remainingPassphrases: remainingPassphrases,
      success: true,
      source: "environment-fallback",
      message: "Using configured fallback value. Set DATABASE_URL environment variable for direct database access.",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Unhandled error in passphrases/remaining API:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json({
      remainingPassphrases: 150185002,
      success: false,
      source: "error-fallback",
      error: "API execution failed",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
}
