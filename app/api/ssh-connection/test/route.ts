import { type NextRequest, NextResponse } from "next/server"
import { NodeSSH } from "node-ssh"

interface SSHTestRequest {
  host: string
  port?: number
  username: string
  password?: string
  privateKey?: string
  timeout?: number
}

interface SSHTestResponse {
  success: boolean
  connected: boolean
  responseTime: number
  serverInfo?: {
    platform?: string
    hostname?: string
    uptime?: string
  }
  error?: string
  timestamp: string
  testing: boolean
}

interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
}

// In-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per 5 minutes per IP

const logSecurityEvent = (event: string, details: any, request: NextRequest) => {
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  console.log(`[SSH-SECURITY] ${new Date().toISOString()} - ${event}`, {
    ip: clientIP,
    userAgent: request.headers.get("user-agent"),
    ...details,
  })
}

const validateSSHRequest = (body: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Host validation
  if (!body.host || typeof body.host !== "string") {
    errors.push("Host is required and must be a string")
  } else if (body.host.length > 253) {
    errors.push("Host must be less than 253 characters")
  } else if (!/^[a-zA-Z0-9.-]+$/.test(body.host)) {
    errors.push("Host contains invalid characters")
  }

  // Port validation
  if (body.port !== undefined) {
    const port = Number(body.port)
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push("Port must be a number between 1 and 65535")
    }
  }

  // Username validation
  if (!body.username || typeof body.username !== "string") {
    errors.push("Username is required and must be a string")
  } else if (body.username.length > 32) {
    errors.push("Username must be less than 32 characters")
  } else if (!/^[a-zA-Z0-9._-]+$/.test(body.username)) {
    errors.push("Username contains invalid characters")
  }

  // Password validation (if provided)
  if (body.password !== undefined) {
    if (typeof body.password !== "string") {
      errors.push("Password must be a string")
    } else if (body.password.length > 128) {
      errors.push("Password must be less than 128 characters")
    }
  }

  // Private key validation (if provided)
  if (body.privateKey !== undefined) {
    if (typeof body.privateKey !== "string") {
      errors.push("Private key must be a string")
    } else if (body.privateKey.length > 8192) {
      errors.push("Private key must be less than 8192 characters")
    }
  }

  // Timeout validation
  if (body.timeout !== undefined) {
    const timeout = Number(body.timeout)
    if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
      errors.push("Timeout must be between 1000 and 30000 milliseconds")
    }
  }

  return { isValid: errors.length === 0, errors }
}

const checkRateLimit = (clientIP: string): { allowed: boolean; resetTime?: number } => {
  const now = Date.now()
  const entry = rateLimitMap.get(clientIP)

  if (!entry) {
    rateLimitMap.set(clientIP, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    })
    return { allowed: true }
  }

  // Reset if window has passed
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientIP, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    })
    return { allowed: true }
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      resetTime: entry.firstRequest + RATE_LIMIT_WINDOW,
    }
  }

  // Increment counter
  entry.count++
  entry.lastRequest = now
  rateLimitMap.set(clientIP, entry)

  return { allowed: true }
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.firstRequest > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW) // Clean up every 5 minutes

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  try {
    const rateLimitCheck = checkRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", { ip: clientIP }, request)

      return NextResponse.json(
        {
          success: false,
          connected: false,
          responseTime: Date.now() - startTime,
          error: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        } as SSHTestResponse,
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    const body: SSHTestRequest = await request.json()

    const validation = validateSSHRequest(body)
    if (!validation.isValid) {
      logSecurityEvent(
        "INVALID_INPUT",
        {
          errors: validation.errors,
          host: body.host,
        },
        request,
      )

      return NextResponse.json(
        {
          success: false,
          connected: false,
          responseTime: Date.now() - startTime,
          error: `Invalid input: ${validation.errors.join(", ")}`,
          timestamp: new Date().toISOString(),
        } as SSHTestResponse,
        { status: 400 },
      )
    }

    const host = body.host
    const port = body.port || 22
    const username = body.username
    const password = body.password || process.env.SSH_DEFAULT_PASSWORD
    const privateKey = body.privateKey || process.env.SSH_DEFAULT_PRIVATE_KEY
    const timeout = body.timeout || 10000

    if (!password && !privateKey) {
      logSecurityEvent("NO_AUTH_METHOD", { host, username }, request)

      return NextResponse.json(
        {
          success: false,
          connected: false,
          responseTime: Date.now() - startTime,
          error: "Authentication required: provide either password or privateKey, or configure default credentials",
          timestamp: new Date().toISOString(),
        } as SSHTestResponse,
        { status: 400 },
      )
    }

    logSecurityEvent(
      "SSH_CONNECTION_ATTEMPT",
      {
        host,
        port,
        username,
        authMethod: password ? "password" : "privateKey",
      },
      request,
    )

    const ssh = new NodeSSH()

    try {
      // Prepare connection configuration with enhanced security
      const connectionConfig: any = {
        host,
        port,
        username,
        readyTimeout: timeout,
        algorithms: {
          kex: [
            "ecdh-sha2-nistp256",
            "ecdh-sha2-nistp384",
            "ecdh-sha2-nistp521",
            "diffie-hellman-group14-sha256",
            "diffie-hellman-group16-sha512",
          ],
          cipher: ["aes128-gcm", "aes256-gcm", "aes128-ctr", "aes256-ctr"],
          hmac: ["hmac-sha2-256", "hmac-sha2-512"],
        },
        keepaliveInterval: 30000,
        keepaliveCountMax: 3,
      }

      // Add authentication method with enhanced security
      if (password) {
        connectionConfig.password = password
      } else if (privateKey) {
        connectionConfig.privateKey = privateKey
      }

      // Attempt SSH connection with timeout
      const connectionPromise = ssh.connect(connectionConfig)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), timeout)
      })

      await Promise.race([connectionPromise, timeoutPromise])

      // Gather basic server information with error handling
      const serverInfo: any = {}

      try {
        const commandTimeout = 5000

        // Get platform information
        const platformResult = await ssh.execCommand("uname -s", {
          execOptions: { timeout: commandTimeout },
        })
        if (platformResult.code === 0 && platformResult.stdout.trim()) {
          serverInfo.platform = platformResult.stdout.trim()
        }

        // Get hostname
        const hostnameResult = await ssh.execCommand("hostname", {
          execOptions: { timeout: commandTimeout },
        })
        if (hostnameResult.code === 0 && hostnameResult.stdout.trim()) {
          serverInfo.hostname = hostnameResult.stdout.trim()
        }

        // Get uptime
        const uptimeResult = await ssh.execCommand("uptime", {
          execOptions: { timeout: commandTimeout },
        })
        if (uptimeResult.code === 0 && uptimeResult.stdout.trim()) {
          serverInfo.uptime = uptimeResult.stdout.trim()
        }
      } catch (infoError) {
        // Server info gathering failed, but connection is still successful
        logSecurityEvent(
          "INFO_GATHERING_FAILED",
          {
            host,
            error: infoError instanceof Error ? infoError.message : "Unknown error",
          },
          request,
        )
      }

      // Close connection
      ssh.dispose()

      const responseTime = Date.now() - startTime

      logSecurityEvent(
        "SSH_CONNECTION_SUCCESS",
        {
          host,
          port,
          username,
          responseTime,
          serverInfo: serverInfo.hostname || "unknown",
        },
        request,
      )

      return NextResponse.json({
        success: true,
        connected: true,
        responseTime,
        serverInfo,
        timestamp: new Date().toISOString(),
      } as SSHTestResponse)
    } catch (sshError) {
      // Ensure connection is disposed
      ssh.dispose()

      const responseTime = Date.now() - startTime
      let errorMessage = "Unknown SSH error"
      let errorCategory = "UNKNOWN"

      if (sshError instanceof Error) {
        if (sshError.message.includes("ECONNREFUSED")) {
          errorMessage = "Connection refused - server may be down or port blocked"
          errorCategory = "CONNECTION_REFUSED"
        } else if (sshError.message.includes("ENOTFOUND")) {
          errorMessage = "Host not found - check IP address or hostname"
          errorCategory = "HOST_NOT_FOUND"
        } else if (sshError.message.includes("ETIMEDOUT") || sshError.message.includes("timeout")) {
          errorMessage = "Connection timeout - server unreachable or network issues"
          errorCategory = "TIMEOUT"
        } else if (sshError.message.includes("Authentication") || sshError.message.includes("auth")) {
          errorMessage = "Authentication failed - check username and credentials"
          errorCategory = "AUTH_FAILED"
        } else if (sshError.message.includes("EHOSTUNREACH")) {
          errorMessage = "Host unreachable - check network connectivity"
          errorCategory = "HOST_UNREACHABLE"
        } else if (sshError.message.includes("ECONNRESET")) {
          errorMessage = "Connection reset by server"
          errorCategory = "CONNECTION_RESET"
        } else if (sshError.message.includes("Protocol")) {
          errorMessage = "SSH protocol error - incompatible versions"
          errorCategory = "PROTOCOL_ERROR"
        } else {
          errorMessage = sshError.message
          errorCategory = "OTHER"
        }
      }

      logSecurityEvent(
        "SSH_CONNECTION_FAILED",
        {
          host,
          port,
          username,
          errorCategory,
          errorMessage,
          responseTime,
        },
        request,
      )

      return NextResponse.json(
        {
          success: false,
          connected: false,
          responseTime,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        } as SSHTestResponse,
        { status: 200 },
      ) // Return 200 for connection test failures (not server errors)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    logSecurityEvent(
      "SERVER_ERROR",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      request,
    )

    console.error("SSH connection test error:", error)

    return NextResponse.json(
      {
        success: false,
        connected: false,
        responseTime,
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      } as SSHTestResponse,
      { status: 500 },
    )
  }
}

// GET endpoint for health check with enhanced monitoring
export async function GET(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  const rateLimitCheck = checkRateLimit(clientIP)
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        service: "SSH Connection Test",
        status: "rate_limited",
        timestamp: new Date().toISOString(),
      },
      { status: 429 },
    )
  }

  const hasDefaultCredentials = !!(process.env.SSH_DEFAULT_PASSWORD || process.env.SSH_DEFAULT_PRIVATE_KEY)

  return NextResponse.json({
    service: "SSH Connection Test",
    status: "operational",
    features: {
      rateLimiting: true,
      inputValidation: true,
      securityLogging: true,
      defaultCredentials: hasDefaultCredentials,
    },
    limits: {
      maxRequestsPerWindow: RATE_LIMIT_MAX_REQUESTS,
      windowSizeMinutes: RATE_LIMIT_WINDOW / (60 * 1000),
      maxTimeout: 30000,
      maxPasswordLength: 128,
      maxPrivateKeyLength: 8192,
    },
    timestamp: new Date().toISOString(),
  })
}
