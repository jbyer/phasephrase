const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const { Pool } = require("pg")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Active miners endpoint
app.get("/api/miners/active", async (req, res) => {
  try {
    // Query to get count of active workers
    const result = await pool.query("SELECT COUNT(*) as active_count FROM btcr.workers WHERE state = $1", ["running"])

    const activeCount = Number.parseInt(result.rows[0].active_count)

    // Also get detailed worker information for additional context
    const workersResult = await pool.query(
      "SELECT id, name, wallet_id, state, heartbeat FROM btcr.workers WHERE state = $1 ORDER BY heartbeat DESC",
      ["running"],
    )

    res.json({
      activeCount,
      workers: workersResult.rows,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database query error:", error)
    res.status(500).json({
      error: "Failed to fetch active miners count",
      timestamp: new Date().toISOString(),
    })
  }
})

// All miners endpoint (additional functionality)
app.get("/api/miners/all", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, wallet_id, state, heartbeat FROM btcr.workers ORDER BY heartbeat DESC",
    )

    const summary = await pool.query(`
      SELECT 
        state,
        COUNT(*) as count
      FROM btcr.workers 
      GROUP BY state
    `)

    res.json({
      workers: result.rows,
      summary: summary.rows,
      total: result.rows.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database query error:", error)
    res.status(500).json({
      error: "Failed to fetch miners data",
      timestamp: new Date().toISOString(),
    })
  }
})

// Miner status update endpoint
app.patch("/api/miners/:id/status", async (req, res) => {
  const { id } = req.params
  const { state } = req.body

  if (!state || !["running", "stopped", "error", "maintenance"].includes(state)) {
    return res.status(400).json({
      error: "Invalid state. Must be one of: running, stopped, error, maintenance",
    })
  }

  try {
    const result = await pool.query("UPDATE btcr.workers SET state = $1, heartbeat = NOW() WHERE id = $2 RETURNING *", [
      state,
      id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Miner not found" })
    }

    res.json({
      message: "Miner status updated successfully",
      worker: result.rows[0],
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database update error:", error)
    res.status(500).json({
      error: "Failed to update miner status",
      timestamp: new Date().toISOString(),
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    timestamp: new Date().toISOString(),
  })
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully")
  await pool.end()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully")
  await pool.end()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Standalone Miners API server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Active miners: http://localhost:${PORT}/api/miners/active`)
})

module.exports = app
