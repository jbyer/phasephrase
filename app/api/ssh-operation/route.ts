import { type NextRequest, NextResponse } from "next/server"
import { NodeSSH } from "node-ssh"

interface SSHConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  workingDirectory: string
  processName: string
}

interface SSHOperationRequest {
  minerId: string
  minerType: "runpod" | "mac"
  operation: "continue" | "refresh" | "stop"
  sshConfig: SSHConfig
}

interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
}

const operationRateLimitMap = new Map<string, RateLimitEntry>()
const OPERATION_RATE_LIMIT_WINDOW = 2 * 60 * 1000 // 2 minutes
const OPERATION_RATE_LIMIT_MAX_REQUESTS = 20 // Max 20 operations per 2 minutes per IP

const logOperationEvent = (event: string, details: any, request: NextRequest) => {
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  console.log(`[SSH-OPERATION] ${new Date().toISOString()} - ${event}`, {
    ip: clientIP,
    userAgent: request.headers.get("user-agent"),
    ...details,
  })
}

const checkOperationRateLimit = (clientIP: string): { allowed: boolean; resetTime?: number } => {
  const now = Date.now()
  const entry = operationRateLimitMap.get(clientIP)

  if (!entry) {
    operationRateLimitMap.set(clientIP, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    })
    return { allowed: true }
  }

  if (now - entry.firstRequest > OPERATION_RATE_LIMIT_WINDOW) {
    operationRateLimitMap.set(clientIP, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
    })
    return { allowed: true }
  }

  if (entry.count >= OPERATION_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      resetTime: entry.firstRequest + OPERATION_RATE_LIMIT_WINDOW,
    }
  }

  entry.count++
  entry.lastRequest = now
  operationRateLimitMap.set(clientIP, entry)

  return { allowed: true }
}

const validateOperationRequest = (body: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!body.minerId || typeof body.minerId !== "string") {
    errors.push("Miner ID is required and must be a string")
  }

  if (!body.minerType || !["runpod", "mac"].includes(body.minerType)) {
    errors.push('Miner type must be either "runpod" or "mac"')
  }

  if (!body.operation || !["continue", "refresh", "stop"].includes(body.operation)) {
    errors.push("Operation must be one of: continue, refresh, stop")
  }

  if (!body.sshConfig || typeof body.sshConfig !== "object") {
    errors.push("SSH config is required and must be an object")
  } else {
    const config = body.sshConfig

    if (!config.host || typeof config.host !== "string") {
      errors.push("SSH host is required")
    }

    if (!config.username || typeof config.username !== "string") {
      errors.push("SSH username is required")
    }

    if (!config.workingDirectory || typeof config.workingDirectory !== "string") {
      errors.push("Working directory is required")
    }

    if (!config.processName || typeof config.processName !== "string") {
      errors.push("Process name is required")
    }
  }

  return { isValid: errors.length === 0, errors }
}

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  try {
    const rateLimitCheck = checkOperationRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      logOperationEvent("RATE_LIMIT_EXCEEDED", { ip: clientIP }, request)

      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded for SSH operations. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    const body: SSHOperationRequest = await request.json()

    const validation = validateOperationRequest(body)
    if (!validation.isValid) {
      logOperationEvent(
        "INVALID_INPUT",
        {
          errors: validation.errors,
          minerId: body.minerId,
        },
        request,
      )

      return NextResponse.json(
        {
          success: false,
          error: `Invalid input: ${validation.errors.join(", ")}`,
        },
        { status: 400 },
      )
    }

    const { minerId, minerType, operation, sshConfig } = body

    const connectionConfig: any = {
      host: process.env.SSH_MINER_HOST || "192.168.100.67",
      port: 22,
      username: process.env.SSH_MINER_USERNAME || "contact",
      password: process.env.SSH_MINER_PASSWORD || "Year20careful!",
      readyTimeout: 15000,
      algorithms: {
        kex: ["ecdh-sha2-nistp256", "ecdh-sha2-nistp384", "ecdh-sha2-nistp521", "diffie-hellman-group14-sha256"],
        cipher: ["aes128-gcm", "aes256-gcm", "aes128-ctr", "aes256-ctr"],
      },
    }

    logOperationEvent(
      "SSH_OPERATION_ATTEMPT",
      {
        minerId,
        minerType,
        operation,
        host: connectionConfig.host,
      },
      request,
    )

    const ssh = new NodeSSH()

    try {
      await ssh.connect(connectionConfig)

      const workingDir = sshConfig.workingDirectory.replace(/[;&|`$()]/g, "")
      const processName = sshConfig.processName.replace(/[;&|`$()]/g, "")

      let command: string

      switch (operation) {
        case "continue":
          command = `cd "${workingDir}" && ./"${processName}" --resume`
          break
        case "refresh":
          command = `cd "${workingDir}" && pkill -f "${processName}" || true && sleep 2 && ./"${processName}" &`
          break
        case "stop":
          command = `pkill -f "${processName}"`
          break
        default:
          throw new Error("Invalid operation")
      }

      const result = await ssh.execCommand(command, {
        cwd: workingDir,
        execOptions: { timeout: 30000 },
      })

      ssh.dispose()

      const success = result.code === 0 || (operation === "stop" && result.code <= 1)

      logOperationEvent(
        success ? "SSH_OPERATION_SUCCESS" : "SSH_OPERATION_FAILED",
        {
          minerId,
          minerType,
          operation,
          exitCode: result.code,
          output: result.stdout?.substring(0, 200),
        },
        request,
      )

      if (success) {
        return NextResponse.json({
          success: true,
          output: result.stdout || result.stderr || `${operation} operation completed successfully`,
          command: command,
          exitCode: result.code,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.stderr || `Command failed with exit code ${result.code}`,
          output: result.stdout,
          command: command,
          exitCode: result.code,
        })
      }
    } catch (sshError) {
      ssh.dispose()

      const errorMessage = sshError instanceof Error ? sshError.message : "Unknown error"

      logOperationEvent(
        "SSH_OPERATION_ERROR",
        {
          minerId,
          minerType,
          operation,
          error: errorMessage,
        },
        request,
      )

      return NextResponse.json(
        {
          success: false,
          error: `SSH connection failed: ${errorMessage}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    logOperationEvent(
      "SERVER_ERROR",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      request,
    )

    console.error("SSH operation error:", error)

    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
