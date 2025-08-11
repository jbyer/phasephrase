// Optional API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey

  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: "Invalid API key",
      timestamp: new Date().toISOString(),
    })
  }

  next()
}

module.exports = { authenticateApiKey }
