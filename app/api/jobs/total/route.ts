import { NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export async function GET() {
  try {
    // Query to get total jobs from wallets table
    const result = await pool.query("SELECT SUM(jobs) as total_jobs FROM btcr.wallets")

    const totalJobs = result.rows[0]?.total_jobs || 0

    return NextResponse.json({
      totalJobs: Number.parseInt(totalJobs),
      success: true,
    })
  } catch (error) {
    console.error("Error fetching total jobs:", error)
    return NextResponse.json({ error: "Failed to fetch total jobs", success: false }, { status: 500 })
  }
}
