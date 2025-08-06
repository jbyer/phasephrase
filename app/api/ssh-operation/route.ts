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

export async function POST(request: NextRequest) {
  try {
    const body: SSHOperationRequest = await request.json()
    const { minerId, minerType, operation, sshConfig } = body

    // Validate required fields
    if (!minerId || !minerType || !operation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create SSH connection
    const ssh = new NodeSSH()

    try {
      // Connect to the remote server using the provided credentials
      const connectionConfig: any = {
        host: "192.168.100.67",
        port: 22,
        username: "contact",
        password: "Year20Careful!"
      }

      await ssh.connect(connectionConfig)

      // Generate command based on operation
      let command: string
      const workingDir = sshConfig.workingDirectory || "/home/user/miner"
      const processName = sshConfig.processName || "bip38_miner"

      switch (operation) {
        case "continue":
          // Resume the miner process
          command = `cd ${workingDir} && ./${processName} --resume`
          break
        case "refresh":
          // Kill and restart the miner process
          command = `cd ${workingDir} && pkill -f ${processName} || true && sleep 2 && ./${processName} &`
          break
        case "stop":
          // Stop the miner process
          command = `pkill -f ${processName}`
          break
        default:
          return NextResponse.json({ error: "Invalid operation" }, { status: 400 })
      }

      // Execute the command
      const result = await ssh.execCommand(command, {
        cwd: workingDir,
      })

      // Close SSH connection
      ssh.dispose()

      // Check if command was successful
      if (result.code === 0 || (operation === "stop" && result.code <= 1)) {
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
      // Make sure to dispose connection on error
      ssh.dispose()

      return NextResponse.json(
        {
          success: false,
          error: `SSH connection failed: ${sshError instanceof Error ? sshError.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
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
