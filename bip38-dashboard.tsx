"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Database, Clock, Zap, Play, Pause, RotateCcw, Shield, Key, BellRing } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Terminal,
  Loader2,
  Edit,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Server, Monitor, Wifi, WifiOff, RefreshCw, PowerOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

// File upload types and interfaces
interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: Date
  status: "uploading" | "success" | "error"
  errorMessage?: string
  processedCount?: number
}

interface FileUploadProgress {
  fileId: string
  progress: number
  status: "uploading" | "processing" | "complete" | "error"
}

// SSH operation types
interface SSHOperation {
  minerId: string
  minerType: "runpod" | "mac"
  operation: "continue" | "refresh" | "stop"
  status: "pending" | "executing" | "success" | "error"
  output?: string
  error?: string
  timestamp: Date
}

interface MinerSSHConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  workingDirectory: string
  processName: string
}

// LLM configuration interface
interface LLMConfig {
  provider: "openai"
  apiKey: string
  model: string
  temperature: number
  minWords: number
  maxWords: number
  phrasesPerRow: number
  seedWords: string
}

export default function Component() {
  const [isMounted, setIsMounted] = useState(false)
  const [isRunning, setIsRunning] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadAlert, setUploadAlert] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)

  // SSH operation states
  const [sshOperations, setSSHOperations] = useState<SSHOperation[]>([])
  const [showSSHDialog, setShowSSHDialog] = useState(false)
  const [selectedMinerForSSH, setSelectedMinerForSSH] = useState<{
    id: string
    type: "runpod" | "mac"
    name: string
  } | null>(null)
  const [sshConfig, setSSHConfig] = useState<MinerSSHConfig>({
    host: "",
    port: 22,
    username: "",
    password: "",
    privateKey: "",
    workingDirectory: "/home/user/miner",
    processName: "miner_process",
  })
  const [showSSHConfigDialog, setShowSSHConfigDialog] = useState(false)

  // View mode state
  const [viewMode, setViewMode] = useState<"live" | "test">("live")

  // Mock data - replace with real data from your application
  const [dashboardData, setDashboardData] = useState({
    minersWorking: 10,
    passphrasesToRun: 150185002,
    totalPassphrases: 10000,
    totalJobs: 0, // New field for actual database jobs count
    daysRemaining: 12.5,
    hashRate: "2.4 MH/s",
    successRate: 0.023,
    lastSuccess: "2 hours ago",
    recentAlerts: [
      {
        type: "Warning",
        description: "High CPU usage on Mac-001. Consider checking background processes.",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        type: "Error",
        description: "Runpod-GPU-2 disconnected. Check network connectivity and miner logs.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        type: "Info",
        description: "New passphrase batch loaded. 5000 new passphrases added to the queue.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newPassphrase, setNewPassphrase] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [passphrases, setPassphrases] = useState([
    {
      id: 1,
      passphrase: "correct horse battery staple",
      description: "Common test phrase",
      status: "pending",
      dateAdded: "2024-01-15",
      priority: "Medium",
    },
    {
      id: 2,
      passphrase: "bitcoin2024",
      description: "Year-based phrase",
      status: "processing",
      dateAdded: "2024-01-14",
      priority: "High",
    },
    {
      id: 3,
      passphrase: "satoshi123",
      description: "Creator reference",
      status: "completed",
      dateAdded: "2024-01-13",
      priority: "Low",
    },
    {
      id: 4,
      passphrase: "blockchain456",
      description: "Technology term",
      status: "failed",
      dateAdded: "2024-01-12",
      priority: "Medium",
    },
    {
      id: 5,
      passphrase: "crypto789",
      description: "Generic crypto term",
      status: "pending",
      dateAdded: "2024-01-11",
      priority: "High",
    },
  ])
  const [showPassphrases, setShowPassphrases] = useState(false)

  // Filter states
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")

  const [miners, setMiners] = useState({
    runpod: [],
    mac: [
      {
        id: "worker 1",
        name: "worker 1",
        status: "running",
        hashRate: "245 KH/s",
        cpu: "M3 Pro",
        cores: 12,
        memory: "18GB",
        uptime: "4h 12m",
        temperature: "45°C",
        sshConfig: {
          host: "192.168.1.100",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 2",
        name: "worker 2",
        status: "running",
        hashRate: "380 KH/s",
        cpu: "M2 Ultra",
        cores: 24,
        memory: "64GB",
        uptime: "6h 28m",
        temperature: "52°C",
        sshConfig: {
          host: "192.168.1.101",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 3",
        name: "worker 3",
        status: "idle",
        hashRate: "0 KH/s",
        cpu: "M1",
        cores: 8,
        memory: "16GB",
        uptime: "0m",
        temperature: "38°C",
        sshConfig: {
          host: "192.168.1.102",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 4",
        name: "worker 4",
        status: "running",
        hashRate: "180 KH/s",
        cpu: "M2",
        cores: 8,
        memory: "16GB",
        uptime: "3h 15m",
        temperature: "42°C",
        sshConfig: {
          host: "192.168.1.103",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 5",
        name: "worker 5",
        status: "running",
        hashRate: "165 KH/s",
        cpu: "M1",
        cores: 8,
        memory: "16GB",
        uptime: "5h 42m",
        temperature: "48°C",
        sshConfig: {
          host: "192.168.1.104",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 6",
        name: "worker 6",
        status: "running",
        hashRate: "420 KH/s",
        cpu: "M3 Max",
        cores: 16,
        memory: "32GB",
        uptime: "2h 18m",
        temperature: "55°C",
        sshConfig: {
          host: "192.168.1.105",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 7",
        name: "worker 7",
        status: "running",
        hashRate: "290 KH/s",
        cpu: "M2 Pro",
        cores: 12,
        memory: "32GB",
        uptime: "1h 55m",
        temperature: "47°C",
        sshConfig: {
          host: "192.168.1.106",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 8",
        name: "worker 8",
        status: "running",
        hashRate: "350 KH/s",
        cpu: "M1 Ultra",
        cores: 20,
        memory: "64GB",
        uptime: "7h 33m",
        temperature: "51°C",
        sshConfig: {
          host: "192.168.1.107",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 9",
        name: "worker 9",
        status: "idle",
        hashRate: "0 KH/s",
        cpu: "M1 Pro",
        cores: 10,
        memory: "16GB",
        uptime: "0m",
        temperature: "35°C",
        sshConfig: {
          host: "192.168.1.108",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
      {
        id: "worker 10",
        name: "worker 10",
        status: "running",
        hashRate: "220 KH/s",
        cpu: "M2",
        cores: 8,
        memory: "24GB",
        uptime: "3h 45m",
        temperature: "44°C",
        sshConfig: {
          host: "192.168.1.109",
          port: 22,
          username: "admin",
          workingDirectory: "/Users/admin/miner",
          processName: "bip38_miner",
        },
      },
    ],
  })

  const [showAddMinerDialog, setShowAddMinerDialog] = useState(false)
  const [newMinerType, setNewMinerType] = useState("runpod")
  const [newMinerConfig, setNewMinerConfig] = useState({
    name: "",
    gpu: "",
    region: "",
    cpu: "",
    cores: "",
    memory: "",
  })

  const [showEditMinerDialog, setShowEditMinerDialog] = useState(false)
  const [editMinerConfig, setEditMinerConfig] = useState({
    id: "",
    name: "",
    gpu: "",
    region: "",
    cpu: "",
    cores: "",
    memory: "",
    type: "runpod" as "runpod" | "mac",
  })

  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    show: boolean
    minerType: "runpod" | "mac" | null
    minerId: string | null
    minerName: string | null
  }>({
    show: false,
    minerType: null,
    minerId: null,
    minerName: null,
  })

  const [showAlertDetailsDialog, setShowAlertDetailsDialog] = useState(false)

  const [realTimeActiveMiners, setRealTimeActiveMiners] = useState<number | null>(null)
  const [lastDatabaseUpdate, setLastDatabaseUpdate] = useState<string>("")

  const [showClearDialog, setShowClearDialog] = useState(false)

  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: "openai",
    apiKey:
      "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",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    minWords: 3,
    maxWords: 8,
    phrasesPerRow: 3,
    seedWords: "",
  })
  const [generateVariations, setGenerateVariations] = useState(false)
  const [showLLMConfig, setShowLLMConfig] = useState(false)

  const fetchTotalJobs = useCallback(async () => {
    try {
      const response = await fetch("/api/jobs/total")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setDashboardData((prev) => ({
          ...prev,
          totalJobs: data.totalJobs,
        }))
      } else {
        console.error("API returned error:", data.error, data.details)
        // Use fallback value if provided
        if (data.totalJobs !== undefined) {
          setDashboardData((prev) => ({
            ...prev,
            totalJobs: data.totalJobs,
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching total jobs:", error)
      // Keep existing value on error
    }
  }, [])

  const fetchActiveMiners = useCallback(async () => {
    try {
      const response = await fetch("/api/miners/active")
      if (response.ok) {
        const data = await response.json()
        setRealTimeActiveMiners(data.activeCount)
        setLastDatabaseUpdate(data.lastUpdated)

        // Update dashboard data with real count
        setDashboardData((prev) => ({
          ...prev,
          minersWorking: data.activeCount,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch active miners:", error)
      // Keep using local state as fallback
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    setCurrentTime(new Date())
  }, [])

  useEffect(() => {
    fetchTotalJobs()

    // Refresh total jobs every 60 seconds
    const interval = setInterval(fetchTotalJobs, 60000)

    return () => clearInterval(interval)
  }, [fetchTotalJobs])

  useEffect(() => {
    // Initial fetch
    fetchActiveMiners()

    // Set up interval for periodic updates (every 30 seconds)
    const interval = setInterval(fetchActiveMiners, 30000)

    return () => clearInterval(interval)
  }, [fetchActiveMiners])

  // Handle real-time updates only on client side
  useEffect(() => {
    if (!isMounted) return

    const timer = setInterval(() => {
      setCurrentTime(new Date())

      // Simulate real-time updates
      if (isRunning) {
        setDashboardData((prev) => ({
          ...prev,
          passphrasesToRun: Math.max(0, prev.passphrasesToRun - Math.floor(Math.random() * 3)),
          hashRate: `${(2.0 + Math.random() * 1.0).toFixed(1)} MH/s`,
        }))
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [isRunning, isMounted])

  // Auto-dismiss alerts after 5 seconds
  useEffect(() => {
    if (uploadAlert) {
      const timer = setTimeout(() => {
        setUploadAlert(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [uploadAlert])

  // SSH operation functions
  const executeSSHOperation = async (
    minerId: string,
    minerType: "runpod" | "mac",
    operation: "continue" | "refresh" | "stop",
  ) => {
    const miner = miners[minerType].find((m) => m.id === minerId)
    if (!miner) return

    const operationId = `${minerId}-${operation}-${Date.now()}`
    const newOperation: SSHOperation = {
      minerId,
      minerType,
      operation,
      status: "pending",
      timestamp: new Date(),
    }

    setSSHOperations((prev) => [...prev, { ...newOperation }])

    try {
      // Update operation status to executing
      setSSHOperations((prev) =>
        prev.map((op) => (op.minerId === minerId && op.operation === operation ? { ...op, status: "executing" } : op)),
      )

      const response = await fetch("/api/ssh-operation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          minerId,
          minerType,
          operation,
          sshConfig: miner.sshConfig,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update operation status to success
        setSSHOperations((prev) =>
          prev.map((op) =>
            op.minerId === minerId && op.operation === operation
              ? { ...op, status: "success", output: result.output }
              : op,
          ),
        )

        // Update miner status based on operation
        setMiners((prev) => ({
          ...prev,
          [minerType]: prev[minerType].map((m) => {
            if (m.id === minerId) {
              let newStatus = m.status
              let newHashRate = m.hashRate
              let newUptime = m.uptime

              switch (operation) {
                case "continue":
                  newStatus = "running"
                  newHashRate = minerType === "runpod" ? "850 KH/s" : "245 KH/s"
                  break
                case "refresh":
                  newStatus = "running"
                  newHashRate = minerType === "runpod" ? "850 KH/s" : "245 KH/s"
                  newUptime = "0m"
                  break
                case "stop":
                  newStatus = "stopped"
                  newHashRate = "0 KH/s"
                  newUptime = "0m"
                  break
              }

              return { ...m, status: newStatus, hashRate: newHashRate, uptime: newUptime }
            }
            return m
          }),
        }))

        setUploadAlert({
          type: "success",
          message: `SSH ${operation} operation completed successfully on ${miner.name}`,
        })
      } else {
        throw new Error(result.error || "SSH operation failed")
      }
    } catch (error) {
      // Update operation status to error
      setSSHOperations((prev) =>
        prev.map((op) =>
          op.minerId === minerId && op.operation === operation
            ? { ...op, status: "error", error: error instanceof Error ? error.message : "Unknown error" }
            : op,
        ),
      )

      setUploadAlert({
        type: "error",
        message: `SSH ${operation} operation failed on ${miner.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    }
  }

  const handleSSHOperation = (
    minerId: string,
    minerType: "runpod" | "mac",
    operation: "continue" | "refresh" | "stop",
  ) => {
    executeSSHOperation(minerId, minerType, operation)
  }

  const openSSHConfig = (minerId: string, minerType: "runpod" | "mac") => {
    const miner = miners[minerType].find((m) => m.id === minerId)
    if (miner) {
      setSelectedMinerForSSH({ id: minerId, type: minerType, name: miner.name })
      setSSHConfig(miner.sshConfig)
      setShowSSHConfigDialog(true)
    }
  }

  const saveSSHConfig = () => {
    if (!selectedMinerForSSH) return

    setMiners((prev) => ({
      ...prev,
      [selectedMinerForSSH.type]: prev[selectedMinerForSSH.type].map((m) =>
        m.id === selectedMinerForSSH.id ? { ...m, sshConfig: { ...sshConfig } } : m,
      ),
    }))

    setShowSSHConfigDialog(false)
    setUploadAlert({
      type: "success",
      message: `SSH configuration updated for ${selectedMinerForSSH.name}`,
    })
  }

  const getOperationIcon = (operation: "continue" | "refresh" | "stop") => {
    switch (operation) {
      case "continue":
        return <Play className="w-3 h-3" />
      case "refresh":
        return <RefreshCw className="w-3 h-3" />
      case "stop":
        return <PowerOff className="w-3 h-3" />
    }
  }

  const getOperationColor = (operation: "continue" | "refresh" | "stop") => {
    switch (operation) {
      case "continue":
        return "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      case "refresh":
        return "border-amber-300 text-amber-700 hover:bg-amber-50"
      case "stop":
        return "border-red-300 text-red-700 hover:bg-red-50"
    }
  }

  const isOperationInProgress = (minerId: string, operation: "continue" | "refresh" | "stop") => {
    return sshOperations.some(
      (op) =>
        op.minerId === minerId && op.operation === operation && (op.status === "pending" || op.status === "executing"),
    )
  }

  // File upload utility functions
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = [
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    const allowedExtensions = [".csv", ".txt", ".xls", ".xlsx"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    // Check file size
    if (file.size > maxSize) {
      return { isValid: false, error: "File size exceeds 10MB limit" }
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: "Invalid file type. Only CSV, TXT, and Excel files are allowed." }
    }

    return { isValid: true }
  }

  const generateFileId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileUpload = async (file: File): Promise<void> => {
    const fileId = generateFileId()

    // Create uploaded file record
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date(),
      status: "uploading",
    }

    setUploadedFiles((prev) => [...prev, uploadedFile])

    // Create progress tracking
    const progressUpdate: FileUploadProgress = {
      fileId,
      progress: 0,
      status: "uploading",
    }

    setUploadProgress((prev) => [...prev, progressUpdate])

    try {
      // Create form data with LLM configuration
      const formData = new FormData()
      formData.append("file", file)
      formData.append("generateVariations", generateVariations.toString())

      if (generateVariations) {
        formData.append("apiKey", llmConfig.apiKey)
        formData.append("model", llmConfig.model)
        formData.append("temperature", llmConfig.temperature.toString())
        formData.append("minWords", llmConfig.minWords.toString())
        formData.append("maxWords", llmConfig.maxWords.toString())
        formData.append("phrasesPerRow", llmConfig.phrasesPerRow.toString())
      }

      // Simulate upload progress
      for (let progress = 0; progress <= 90; progress += 15) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, progress } : p)))
      }

      // Make actual API call
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      // Complete progress
      setUploadProgress((prev) =>
        prev.map((p) => (p.fileId === fileId ? { ...p, progress: 100, status: "complete" } : p)),
      )

      // Update uploaded file record
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "success",
                processedCount: result.processedCount,
              }
            : f,
        ),
      )

      // Update dashboard data
      setDashboardData((prev) => ({
        ...prev,
        totalPassphrases: prev.totalPassphrases + result.processedCount,
        passphrasesToRun: prev.passphrasesToRun + result.processedCount,
      }))

      setUploadAlert({
        type: "success",
        message: result.variationsGenerated
          ? `Successfully uploaded ${file.name} and generated ${result.processedCount} phrase variations using ${llmConfig.provider.toUpperCase()}.`
          : `Successfully uploaded and processed ${file.name}. Added ${result.processedCount} passphrases.`,
      })
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                errorMessage: error instanceof Error ? error.message : "Upload failed. Please try again.",
              }
            : f,
        ),
      )

      setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, status: "error" } : p)))

      setUploadAlert({
        type: "error",
        message: `Failed to upload ${file.name}. ${error instanceof Error ? error.message : "Please try again."}`,
      })
    }

    // Remove progress tracking after completion
    setTimeout(() => {
      setUploadProgress((prev) => prev.filter((p) => p.fileId !== fileId))
    }, 3000)
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = validateFile(file)

    if (!validation.isValid) {
      setUploadAlert({
        type: "error",
        message: validation.error || "Invalid file",
      })
      return
    }

    await handleFileUpload(file)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files)
    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
    handleFileSelect(event.dataTransfer.files)
  }

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const dismissAlert = () => {
    setUploadAlert(null)
  }

  const getThemeClasses = (viewMode: "live" | "test") => {
    if (viewMode === "test") {
      return {
        background: "bg-gradient-to-br from-orange-50 via-red-50 to-pink-50",
        card: "bg-white/80 backdrop-blur-sm border-orange-200 shadow-lg",
        cardHover: "hover:shadow-xl",
        button: "bg-orange-600 hover:bg-orange-700",
        buttonOutline: "bg-white border-orange-300 hover:bg-orange-50",
        badge: "bg-orange-100 text-orange-800 border-orange-200",
        accent: "text-orange-600",
        icon: "text-orange-600",
      }
    }
    return {
      background: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
      card: "bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg",
      cardHover: "hover:shadow-xl",
      button: "bg-blue-600 hover:bg-blue-700",
      buttonOutline: "bg-white border-gray-300 hover:bg-gray-50",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      accent: "text-blue-600",
      icon: "text-blue-600",
    }
  }

  const filteredPassphrases = passphrases.filter((p) => {
    const matchesSearch =
      p.passphrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === "all" || p.status === filterStatus
    const matchesPriority = filterPriority === "all" || p.priority === filterPriority

    const passphraseDate = new Date(p.dateAdded)
    const startDate = filterStartDate ? new Date(filterStartDate) : null
    const endDate = filterEndDate ? new Date(filterEndDate) : null

    const matchesDate = (!startDate || passphraseDate >= startDate) && (!endDate || passphraseDate <= endDate)

    return matchesSearch && matchesStatus && matchesPriority && matchesDate
  })

  const handleClearAllPassphrases = () => {
    setPassphrases([])
    setDashboardData((prev) => ({
      ...prev,
      totalPassphrases: 0,
      passphrasesToRun: 0,
    }))
    setShowClearDialog(false)
  }

  const handleAddPassphrase = () => {
    if (newPassphrase.trim()) {
      const newEntry = {
        id: passphrases.length + 1,
        passphrase: newPassphrase.trim(),
        description: newDescription.trim() || "No description",
        status: "pending",
        dateAdded: new Date().toISOString().split("T")[0],
        priority: "Medium", // Default priority for new passphrases
      }
      setPassphrases([...passphrases, newEntry])
      setNewPassphrase("")
      setNewDescription("")
      setShowAddDialog(false)

      // Update dashboard data
      setDashboardData((prev) => ({
        ...prev,
        totalPassphrases: prev.totalPassphrases + 1,
        passphrasesToRun: prev.passphrasesToRun + 1,
      }))
    }
  }

  const handleDeletePassphrase = (id: number) => {
    setPassphrases(passphrases.filter((p) => p.id !== id))
    setDashboardData((prev) => ({
      ...prev,
      totalPassphrases: prev.totalPassphrases - 1,
      passphrasesToRun: prev.passphrasesToRun - 1,
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-600"
      case "processing":
        return "text-amber-600"
      case "failed":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "processing":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "failed":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700 border-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "Low":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const progressPercentage =
    ((dashboardData.totalPassphrases - dashboardData.passphrasesToRun) / dashboardData.totalPassphrases) * 100

  const handleMinerAction = (type: "runpod" | "mac", minerId: string, action: "start" | "stop" | "restart") => {
    setMiners((prev) => ({
      ...prev,
      [type]: prev[type].map((miner) => {
        if (miner.id === minerId) {
          let newStatus = miner.status
          let newHashRate = miner.hashRate
          let newUptime = miner.uptime

          switch (action) {
            case "start":
              newStatus = "running"
              newHashRate = type === "runpod" ? "850 KH/s" : "245 KH/s"
              newUptime = "0m"
              break
            case "stop":
              newStatus = "stopped"
              newHashRate = "0 KH/s"
              newUptime = "0m"
              break
            case "restart":
              newStatus = "running"
              newHashRate = type === "runpod" ? "850 KH/s" : "245 KH/s"
              newUptime = "0m"
              break
          }

          return { ...miner, status: newStatus, hashRate: newHashRate, uptime: newUptime }
        }
        return miner
      }),
    }))

    // Update active miners count
    const totalRunning = [...miners.runpod, ...miners.mac].filter((m) => m.status === "running").length
    setDashboardData((prev) => ({ ...prev, minersWorking: totalRunning }))
  }

  const handleAddMiner = () => {
    if (newMinerConfig.name.trim()) {
      const newMiner =
        newMinerType === "runpod"
          ? {
              id: `rp-${Date.now()}`,
              name: newMinerConfig.name,
              status: "stopped",
              hashRate: "0 KH/s",
              gpu: newMinerConfig.gpu || "RTX 4090",
              region: newMinerConfig.region || "US-West",
              cost: "$0.00/hr",
              uptime: "0m",
              temperature: "N/A",
              sshConfig: {
                host: "",
                port: 22,
                username: "root",
                workingDirectory: "/workspace/miner",
                processName: "bip38_miner",
              },
            }
          : {
              id: `mac-${Date.now()}`,
              name: newMinerConfig.name,
              status: "stopped",
              hashRate: "0 KH/s",
              cpu: newMinerConfig.cpu || "M3",
              cores: Number.parseInt(newMinerConfig.cores) || 8,
              memory: "16GB",
              uptime: "0m",
              temperature: "N/A",
              sshConfig: {
                host: "",
                port: 22,
                username: "admin",
                workingDirectory: "/Users/admin/miner",
                processName: "bip38_miner",
              },
            }

      setMiners((prev) => ({
        ...prev,
        [newMinerType]: [...prev[newMinerType], newMiner],
      }))

      setNewMinerConfig({ name: "", gpu: "", region: "", cpu: "", cores: "", memory: "" })
      setShowAddMinerDialog(false)
    }
  }

  const handleEditMiner = () => {
    if (editMinerConfig.name.trim() && editMinerConfig.id) {
      setMiners((prev) => ({
        ...prev,
        [editMinerConfig.type]: prev[editMinerConfig.type].map((miner) => {
          if (miner.id === editMinerConfig.id) {
            if (editMinerConfig.type === "runpod") {
              return {
                ...miner,
                name: editMinerConfig.name,
                gpu: editMinerConfig.gpu || miner.gpu,
                region: editMinerConfig.region || miner.region,
              }
            } else {
              return {
                ...miner,
                name: editMinerConfig.name,
                cpu: editMinerConfig.cpu || miner.cpu,
                cores: Number.parseInt(editMinerConfig.cores) || miner.cores,
                memory: editMinerConfig.memory || miner.memory,
              }
            }
          }
          return miner
        }),
      }))

      setEditMinerConfig({
        id: "",
        name: "",
        gpu: "",
        region: "",
        cpu: "",
        cores: "",
        memory: "",
        type: "runpod",
      })
      setShowEditMinerDialog(false)
    }
  }

  const openEditMiner = (type: "runpod" | "mac", minerId: string) => {
    const miner = miners[type].find((m) => m.id === minerId)
    if (miner) {
      if (type === "runpod") {
        setEditMinerConfig({
          id: minerId,
          name: miner.name,
          gpu: miner.gpu,
          region: miner.region,
          cpu: "",
          cores: "",
          memory: "",
          type: "runpod",
        })
      } else {
        setEditMinerConfig({
          id: minerId,
          name: miner.name,
          gpu: "",
          region: "",
          cpu: miner.cpu,
          cores: miner.cores.toString(),
          memory: miner.memory,
          type: "mac",
        })
      }
      setShowEditMinerDialog(true)
    }
  }

  const triggerDeleteMiner = (type: "runpod" | "mac", minerId: string) => {
    const miner = miners[type].find((m) => m.id === minerId)
    setDeleteConfirmDialog({
      show: true,
      minerType: type,
      minerId: minerId,
      minerName: miner?.name || "Unknown Miner",
    })
  }

  const confirmDeleteMiner = () => {
    if (deleteConfirmDialog.minerType && deleteConfirmDialog.minerId) {
      setMiners((prev) => ({
        ...prev,
        [deleteConfirmDialog.minerType!]: prev[deleteConfirmDialog.minerType!].filter(
          (miner) => miner.id !== deleteConfirmDialog.minerId,
        ),
      }))

      // Update active miners count
      const totalRunning = [...miners.runpod, ...miners.mac].filter(
        (m) => m.status === "running" && m.id !== deleteConfirmDialog.minerId,
      ).length
      setDashboardData((prev) => ({ ...prev, minersWorking: totalRunning }))
    }

    setDeleteConfirmDialog({
      show: false,
      minerType: null,
      minerId: null,
      minerName: null,
    })
  }

  const getMinerStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-emerald-600"
      case "stopped":
        return "text-red-600"
      case "idle":
        return "text-amber-600"
      default:
        return "text-gray-600"
    }
  }

  const getMinerStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "stopped":
        return "bg-red-100 text-red-700 border-red-200"
      case "idle":
        return "bg-amber-100 text-amber-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatTimeAgo = (date: Date) => {
    if (!isMounted || !date) return "Loading..."

    try {
      const now = currentTime || new Date()
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      let interval = seconds / 31536000
      if (interval > 1) return Math.floor(interval) + " years ago"
      interval = seconds / 2592000
      if (interval > 1) return Math.floor(interval) + " months ago"
      interval = seconds / 86400
      if (interval > 1) return Math.floor(interval) + " days ago"
      interval = seconds / 3600
      if (interval > 1) return Math.floor(interval) + " hours ago"
      interval = seconds / 60
      if (interval > 1) return Math.floor(interval) + " minutes ago"
      return Math.floor(seconds) + " seconds ago"
    } catch (error) {
      return "Unknown"
    }
  }

  // Show loading state during hydration
  if (!isMounted) {
    return (
      <div className={`min-h-screen ${getThemeClasses(viewMode).background} p-3 sm:p-6`}>
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-600">Loading dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  const updateMinerStatus = async (minerId: string, minerType: "runpod" | "mac", newStatus: string) => {
    setMiners((prev) => ({
      ...prev,
      [minerType]: prev[minerType].map((miner) => {
        if (miner.id === minerId) {
          return { ...miner, status: newStatus }
        }
        return miner
      }),
    }))

    setTimeout(fetchActiveMiners, 1000) // Small delay to ensure database is updated
  }

  const deleteMiner = () => {
    if (deleteConfirmDialog.minerType && deleteConfirmDialog.minerId) {
      setMiners((prev) => ({
        ...prev,
        [deleteConfirmDialog.minerType!]: prev[deleteConfirmDialog.minerType!].filter(
          (miner) => miner.id !== deleteConfirmDialog.minerId,
        ),
      }))

      // Update active miners count
      const totalRunning = [...miners.runpod, ...miners.mac].filter(
        (m) => m.status === "running" && m.id !== deleteConfirmDialog.minerId,
      ).length
      setDashboardData((prev) => ({ ...prev, minersWorking: totalRunning }))
    }

    setDeleteConfirmDialog({
      show: false,
      minerType: null,
      minerId: null,
      minerName: null,
    })

    setTimeout(fetchActiveMiners, 1000)
  }

  return (
    <div className={`min-h-screen ${getThemeClasses(viewMode).background} p-3 sm:p-6`}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Upload Alert */}
        {uploadAlert && (
          <Alert
            className={`${
              uploadAlert.type === "success"
                ? "border-green-200 bg-green-50"
                : uploadAlert.type === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-blue-200 bg-blue-50"
            }`}
          >
            {uploadAlert.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
            {uploadAlert.type === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
            {uploadAlert.type === "info" && <AlertCircle className="h-4 w-4 text-blue-600" />}
            <AlertDescription
              className={`${
                uploadAlert.type === "success"
                  ? "text-green-800"
                  : uploadAlert.type === "error"
                    ? "text-red-800"
                    : "text-blue-800"
              }`}
            >
              {uploadAlert.message}
            </AlertDescription>
            <Button variant="ghost" size="sm" onClick={dismissAlert} className="absolute right-2 top-2 h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Shield className={`w-6 h-6 sm:w-8 sm:h-8 ${getThemeClasses(viewMode).icon}`} />
              <span className="break-words">Passphrase Decryption Dashboard</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Real-time monitoring of passphrase decryption operations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <Badge className={`px-2 sm:px-3 py-1 ${getThemeClasses(viewMode).badge} text-xs sm:text-sm`}>
              {isRunning ? "RUNNING" : "PAUSED"}
            </Badge>
            <div className="flex flex-col items-end gap-1">
              <div className="text-gray-500 text-xs sm:text-sm">
                {currentTime ? currentTime.toLocaleTimeString() : "Loading..."}
              </div>
              <Dialog open={showAlertDetailsDialog} onOpenChange={setShowAlertDetailsDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                      dashboardData.recentAlerts.length > 0 ? "animate-shake" : ""
                    }`}
                  >
                    <BellRing className="h-6 w-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 flex items-center gap-2">
                      <BellRing className="w-5 h-5 text-red-600" />
                      System Alerts
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Recent system notifications and alerts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dashboardData.recentAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <Badge
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            alert.type === "Error"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : alert.type === "Warning"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                          }`}
                        >
                          {alert.type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-tight">{alert.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(alert.timestamp)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDashboardData((prev) => ({
                              ...prev,
                              recentAlerts: prev.recentAlerts.filter((_, i) => i !== index),
                            }))
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {dashboardData.recentAlerts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BellRing className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No recent alerts</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowAlertDetailsDialog(false)}
                      className="bg-white border-gray-300"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <Card
          className={`${getThemeClasses(viewMode).card} ${getThemeClasses(viewMode).cardHover} transition-all duration-200`}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${viewMode === "live" ? "bg-green-500 animate-pulse" : "bg-orange-500"}`}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">
                    {viewMode === "live" ? "LIVE MODE" : "TEST MODE"}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {viewMode === "live" ? "Real-time data" : "Simulated environment"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="view-toggle" className="text-sm text-gray-700">
                  Switch to {viewMode === "live" ? "Test" : "Live"} Mode
                </Label>
                <Switch
                  id="view-toggle"
                  checked={viewMode === "test"}
                  onCheckedChange={(checked) => setViewMode(checked ? "test" : "live")}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Control Panel */}
        <Card className={getThemeClasses(viewMode).card}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? "destructive" : "default"}
                  className={`flex items-center gap-2 shadow-md text-sm`}
                  size="sm"
                >
                  {isRunning ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 ${getThemeClasses(viewMode).buttonOutline} text-sm`}
                  size="sm"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Reset
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Key className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  <span className="whitespace-nowrap">
                    Success Rate: {(dashboardData.successRate * 100).toFixed(3)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {/* Miners Working */}
          <Card
            className={`${getThemeClasses(viewMode).card} ${getThemeClasses(viewMode).cardHover} transition-all duration-200`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Active Miners</CardTitle>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {realTimeActiveMiners !== null ? realTimeActiveMiners : dashboardData.minersWorking}
              </div>
              <p className="text-xs text-gray-600 mt-1">Currently processing</p>
              {lastDatabaseUpdate && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(lastDatabaseUpdate).toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-center mt-2">
                <div className="flex space-x-1">
                  {Array.from({
                    length: realTimeActiveMiners !== null ? realTimeActiveMiners : dashboardData.minersWorking,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passphrases Remaining */}
          <Card
            className={`${getThemeClasses(viewMode).card} ${getThemeClasses(viewMode).cardHover} transition-all duration-200`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Passphrases Remaining</CardTitle>
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {dashboardData.passphrasesToRun.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Queued for processing</p>
              <Progress value={progressPercentage} className="mt-2 h-2" />
              <p className="text-xs text-gray-600 mt-1">{progressPercentage.toFixed(1)}% complete</p>
            </CardContent>
          </Card>

          {/* Total Jobs */}
          <Card
            className={`${getThemeClasses(viewMode).card} ${getThemeClasses(viewMode).cardHover} transition-all duration-200`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Jobs</CardTitle>
              <Database className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {dashboardData.totalJobs.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Database jobs processed</p>
              <div className="mt-2 text-xs text-gray-600">Live count from database</div>
            </CardContent>
          </Card>

          {/* Days Remaining */}
          <Card
            className={`${getThemeClasses(viewMode).card} ${getThemeClasses(viewMode).cardHover} transition-all duration-200`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Estimated Time</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {dashboardData.daysRemaining.toFixed(1)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Days remaining</p>
              <div className="mt-2 text-xs text-gray-600">At current rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Passphrase Management */}
        <Card className={getThemeClasses(viewMode).card}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900">Passphrase Management</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Search, add, and manage your passphrase database
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPassphrases(!showPassphrases)}
                  className="bg-white border-gray-300 hover:bg-gray-50 text-xs sm:text-sm"
                >
                  {showPassphrases ? (
                    <EyeOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  ) : (
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  )}
                  {showPassphrases ? "Hide" : "Show"} Passphrases
                </Button>

                <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={passphrases.length === 0}
                      className="bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Clear All
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Clear All Passphrases</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Are you sure you want to clear all passphrases? This action cannot be undone and will remove all{" "}
                        {passphrases.length} passphrases from the list.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowClearDialog(false)}
                        className="bg-white border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleClearAllPassphrases} className="bg-red-600 hover:bg-red-700 text-white">
                        Clear All Passphrases
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button
                      className={`flex items-center gap-1 sm:gap-2 ${getThemeClasses(viewMode).button} shadow-md text-xs sm:text-sm`}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      Add Passphrase
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Add New Passphrase</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Add a new passphrase to the decryption queue
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="passphrase" className="text-gray-700">
                          Passphrase
                        </Label>
                        <Input
                          id="passphrase"
                          value={newPassphrase}
                          onChange={(e) => setNewPassphrase(e.target.value)}
                          placeholder="Enter passphrase..."
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description" className="text-gray-700">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="description"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Add a description for this passphrase..."
                          className="bg-white border-gray-300 text-gray-900"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                        className="bg-white border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddPassphrase}
                        disabled={!newPassphrase.trim()}
                        className={getThemeClasses(viewMode).button}
                      >
                        Add Passphrase
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                <Input
                  placeholder="Search passphrases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 bg-white border-gray-300 text-gray-900 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* File Upload Button */}
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-300 hover:bg-gray-50 text-xs flex-1 sm:flex-none"
                    >
                      <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Import Passphrases</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Upload CSV, TXT, or Excel files containing passphrases to add to your database
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* LLM Generation Toggle */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="generateVariations"
                              checked={generateVariations}
                              onChange={(e) => setGenerateVariations(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="generateVariations" className="font-medium text-blue-900">
                              Generate AI Phrase Variations
                            </label>
                          </div>
                          {generateVariations && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowLLMConfig(!showLLMConfig)}
                              className="text-xs"
                            >
                              {showLLMConfig ? "Hide" : "Show"} Config
                            </Button>
                          )}
                        </div>

                        {generateVariations && (
                          <p className="text-sm text-blue-800 mb-3">
                            Use AI to generate multiple variations of each passphrase in your file. This will create
                            additional passphrases with similar meanings but different wording.
                          </p>
                        )}

                        {/* LLM Configuration Panel */}
                        {generateVariations && showLLMConfig && (
                          <div className="space-y-4 border-t border-blue-200 pt-4">
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-blue-900 mb-1">
                                Seed Words (Optional)
                              </label>
                              <input
                                type="text"
                                value={llmConfig.seedWords}
                                onChange={(e) => {
                                  const words = e.target.value.split(" ").filter((word) => word.trim() !== "")
                                  if (words.length <= 3) {
                                    setLLMConfig((prev) => ({ ...prev, seedWords: e.target.value }))
                                  }
                                }}
                                placeholder="Enter up to 3 words to influence phrase generation"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                              <p className="text-xs text-blue-700 mt-1">
                                Enter up to 3 words that will be incorporated into the generated phrase variations
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-blue-900 mb-1">API Key</label>
                                <input
                                  type="password"
                                  value={llmConfig.apiKey}
                                  onChange={(e) => setLLMConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                                  placeholder="Enter OpenAI API key"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-blue-900 mb-1">Model</label>
                                <input
                                  type="text"
                                  value={llmConfig.model}
                                  onChange={(e) => setLLMConfig((prev) => ({ ...prev, model: e.target.value }))}
                                  placeholder="gpt-3.5-turbo"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-blue-900 mb-1">
                                  Variations per Phrase
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={llmConfig.phrasesPerRow}
                                  onChange={(e) =>
                                    setLLMConfig((prev) => ({
                                      ...prev,
                                      phrasesPerRow: Number.parseInt(e.target.value),
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-blue-900 mb-1">Min Words</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={llmConfig.minWords}
                                  onChange={(e) =>
                                    setLLMConfig((prev) => ({ ...prev, minWords: Number.parseInt(e.target.value) }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-blue-900 mb-1">Max Words</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={llmConfig.maxWords}
                                  onChange={(e) =>
                                    setLLMConfig((prev) => ({ ...prev, maxWords: Number.parseInt(e.target.value) }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* File Upload Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-gray-900">Drop your files here, or click to browse</p>
                          <p className="text-sm text-gray-600">
                            Supports CSV, TXT, and Excel files (.csv, .txt, .xls, .xlsx) up to 10MB
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 bg-transparent"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose Files
                        </Button>
                      </div>

                      {/* Upload Progress */}
                      {uploadProgress.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Upload Progress</h4>
                          {uploadProgress.map((progress) => {
                            const file = uploadedFiles.find((f) => f.id === progress.fileId)
                            return (
                              <div key={progress.fileId} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700 truncate">{file?.name}</span>
                                  <span className="text-gray-500">
                                    {progress.status === "uploading" && `${progress.progress}%`}
                                    {progress.status === "processing" && "Processing..."}
                                    {progress.status === "complete" && "Complete"}
                                    {progress.status === "error" && "Error"}
                                  </span>
                                </div>
                                <Progress
                                  value={progress.status === "complete" ? 100 : progress.progress}
                                  className="h-2"
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Recent Uploads</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadedFiles.slice(-5).map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.size)} • {file.uploadDate.toLocaleDateString()}
                                      {file.processedCount && ` • ${file.processedCount} passphrases`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={`text-xs ${
                                      file.status === "success"
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : file.status === "error"
                                          ? "bg-red-100 text-red-700 border-red-200"
                                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                    }`}
                                  >
                                    {file.status === "success" && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {file.status === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {file.status}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeUploadedFile(file.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File Format Information */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">File Format Requirements</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• CSV files should have headers: passphrase, description, priority</li>
                          <li>
                            • TXT files should have one passphrase per line (description and priority will default to
                            "Imported" and "Medium")
                          </li>
                          <li>• Excel files should have data starting from row 1 with headers</li>
                          <li>• Priority values: High, Medium, Low (optional, defaults to Medium)</li>
                          <li>• Maximum file size: 10MB</li>
                          <li>• Supported formats: .csv, .txt, .xls, .xlsx</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowUploadDialog(false)}
                        className="bg-white border-gray-300"
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-gray-300 hover:bg-gray-50 text-xs flex-1 sm:flex-none"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {showPassphrases && (
              <>
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="filter-status" className="text-gray-700 text-xs">
                      Status
                    </Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger id="filter-status" className="bg-white border-gray-300 text-gray-900 text-sm">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="filter-priority" className="text-gray-700 text-xs">
                      Priority
                    </Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger id="filter-priority" className="bg-white border-gray-300 text-gray-900 text-sm">
                        <SelectValue placeholder="Filter by priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="filter-start-date" className="text-gray-700 text-xs">
                        Start Date
                      </Label>
                      <Input
                        id="filter-start-date"
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="filter-end-date" className="text-gray-700 text-xs">
                        End Date
                      </Label>
                      <Input
                        id="filter-end-date"
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">{passphrases.length}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-base sm:text-lg font-semibold text-amber-700">
                      {passphrases.filter((p) => p.status === "pending").length}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-base sm:text-lg font-semibold text-emerald-700">
                      {passphrases.filter((p) => p.status === "completed").length}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-base sm:text-lg font-semibold text-red-700">
                      {passphrases.filter((p) => p.status === "failed").length}
                    </div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                </div>

                {/* Passphrase Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 bg-gray-50">
                          <TableHead className="text-gray-700 text-xs sm:text-sm min-w-[120px]">Passphrase</TableHead>
                          <TableHead className="text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                            Description
                          </TableHead>
                          <TableHead className="text-gray-700 text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                            Priority
                          </TableHead>
                          <TableHead className="text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                            Date Added
                          </TableHead>
                          <TableHead className="text-gray-700 text-xs sm:text-sm w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPassphrases.map((passphrase) => (
                          <TableRow key={passphrase.id} className="border-gray-200 hover:bg-gray-50">
                            <TableCell className="text-gray-900 font-mono text-xs sm:text-sm max-w-[120px] truncate">
                              {passphrase.passphrase}
                            </TableCell>
                            <TableCell className="text-gray-600 text-xs sm:text-sm hidden sm:table-cell max-w-[150px] truncate">
                              {passphrase.description}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusBadge(passphrase.status)} border text-xs`}>
                                {passphrase.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge className={`${getPriorityBadge(passphrase.priority)} border text-xs`}>
                                {passphrase.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600 text-xs hidden md:table-cell">
                              {passphrase.dateAdded}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePassphrase(passphrase.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredPassphrases.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No passphrases match your search" : "No passphrases found"}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Miner Management */}
        <Card className={getThemeClasses(viewMode).card}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900">Miner Management</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Control and monitor your Runpod and Mac miners via SSH
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showAddMinerDialog} onOpenChange={setShowAddMinerDialog}>
                  <DialogTrigger asChild>
                    <Button className={`flex items-center gap-2 ${getThemeClasses(viewMode).button} shadow-md`}>
                      <Plus className="w-4 h-4" />
                      Add Miner
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Add New Miner</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Add a new Runpod or Mac miner to your fleet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="miner-type" className="text-gray-700">
                          Miner Type
                        </Label>
                        <Select value={newMinerType} onValueChange={setNewMinerType}>
                          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200">
                            <SelectItem value="runpod">Runpod GPU</SelectItem>
                            <SelectItem value="mac">Mac Computer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miner-name" className="text-gray-700">
                          Miner Name
                        </Label>
                        <Input
                          id="miner-name"
                          value={newMinerConfig.name}
                          onChange={(e) => setNewMinerConfig((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter miner name..."
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      {newMinerType === "runpod" ? (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="gpu" className="text-gray-700">
                              GPU Model
                            </Label>
                            <Select
                              value={newMinerConfig.gpu}
                              onValueChange={(value) => setNewMinerConfig((prev) => ({ ...prev, gpu: value }))}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Select GPU" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="RTX 4090">RTX 4090</SelectItem>
                                <SelectItem value="RTX 4080">RTX 4080</SelectItem>
                                <SelectItem value="RTX 3090">RTX 3090</SelectItem>
                                <SelectItem value="RTX 3080">RTX 3080</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="region" className="text-gray-700">
                              Region
                            </Label>
                            <Select
                              value={newMinerConfig.region}
                              onValueChange={(value) => setNewMinerConfig((prev) => ({ ...prev, region: value }))}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="US-West">US West</SelectItem>
                                <SelectItem value="US-East">US East</SelectItem>
                                <SelectItem value="EU-Central">EU Central</SelectItem>
                                <SelectItem value="Asia-Pacific">Asia Pacific</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="cpu" className="text-gray-700">
                              CPU Model
                            </Label>
                            <Select
                              value={newMinerConfig.cpu}
                              onValueChange={(value) => setNewMinerConfig((prev) => ({ ...prev, cpu: value }))}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Select CPU" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="M3 Pro">M3 Pro</SelectItem>
                                <SelectItem value="M3 Max">M3 Max</SelectItem>
                                <SelectItem value="M2 Ultra">M2 Ultra</SelectItem>
                                <SelectItem value="M2 Pro">M2 Pro</SelectItem>
                                <SelectItem value="M1">M1</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-2">
                              <Label htmlFor="cores" className="text-gray-700">
                                CPU Cores
                              </Label>
                              <Input
                                id="cores"
                                type="number"
                                value={newMinerConfig.cores}
                                onChange={(e) => setNewMinerConfig((prev) => ({ ...prev, cores: e.target.value }))}
                                placeholder="8"
                                className="bg-white border-gray-300 text-gray-900"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="memory" className="text-gray-700">
                                Memory
                              </Label>
                              <Input
                                id="memory"
                                value={newMinerConfig.memory}
                                onChange={(e) => setNewMinerConfig((prev) => ({ ...prev, memory: e.target.value }))}
                                placeholder="16GB"
                                className="bg-white border-gray-300 text-gray-900"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowAddMinerDialog(false)}
                        className="bg-white border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddMiner}
                        disabled={!newMinerConfig.name.trim()}
                        className={getThemeClasses(viewMode).button}
                      >
                        Add Miner
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="mac" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200">
                <TabsTrigger value="mac" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                  <Monitor className="w-4 h-4 mr-2 text-purple-600" />
                  Mac Miners ({miners.mac.length})
                </TabsTrigger>
                <TabsTrigger value="runpod" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                  <Server className="w-4 h-4 mr-2 text-blue-600" />
                  Runpod Miners ({miners.runpod.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="runpod" className="space-y-4">
                <div className="grid gap-4">
                  {miners.runpod.map((miner) => (
                    <Card key={miner.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Server className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                  {miner.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                  {miner.gpu} • {miner.region}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getMinerStatusBadge(miner.status)} border text-xs flex-shrink-0`}>
                              {miner.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <div className="text-sm font-medium text-gray-900">{miner.hashRate}</div>
                              <div className="text-xs text-gray-600">{miner.cost}</div>
                            </div>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {/* SSH Operation Buttons */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "runpod", "continue")}
                                disabled={isOperationInProgress(miner.id, "continue")}
                                className={`bg-white ${getOperationColor("continue")} p-1.5`}
                                title="Continue Miner"
                              >
                                {isOperationInProgress(miner.id, "continue") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("continue")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "runpod", "refresh")}
                                disabled={isOperationInProgress(miner.id, "refresh")}
                                className={`bg-white ${getOperationColor("refresh")} p-1.5`}
                                title="Refresh Miner"
                              >
                                {isOperationInProgress(miner.id, "refresh") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("refresh")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "runpod", "stop")}
                                disabled={isOperationInProgress(miner.id, "stop")}
                                className={`bg-white ${getOperationColor("stop")} p-1.5`}
                                title="Stop Miner"
                              >
                                {isOperationInProgress(miner.id, "stop") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("stop")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSSHConfig(miner.id, "runpod")}
                                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 p-1.5"
                                title="SSH Config"
                              >
                                <Terminal className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditMiner("runpod", miner.id)}
                                className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 p-1.5"
                                title="Edit Miner"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerDeleteMiner("runpod", miner.id)}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                                title="Remove Miner"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.uptime}</div>
                            <div className="text-xs text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-xs sm:text-sm font-medium ${miner.status === "running" ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {miner.status === "running" ? (
                                <Wifi className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                              ) : (
                                <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                              )}
                            </div>
                            <div className="text-xs text-gray-600">Connection</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="mac" className="space-y-4">
                <div className="grid gap-4">
                  {miners.mac.map((miner) => (
                    <Card key={miner.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                  {miner.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                  {miner.cpu} • {miner.cores} cores • {miner.memory}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getMinerStatusBadge(miner.status)} border text-xs flex-shrink-0`}>
                              {miner.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <div className="text-sm font-medium text-gray-900">{miner.hashRate}</div>
                              <div className="text-xs text-gray-600">Hash Rate</div>
                            </div>
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {/* SSH Operation Buttons */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "mac", "continue")}
                                disabled={isOperationInProgress(miner.id, "continue")}
                                className={`bg-white ${getOperationColor("continue")} p-1.5`}
                                title="Continue Miner"
                              >
                                {isOperationInProgress(miner.id, "continue") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("continue")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "mac", "refresh")}
                                disabled={isOperationInProgress(miner.id, "refresh")}
                                className={`bg-white ${getOperationColor("refresh")} p-1.5`}
                                title="Refresh Miner"
                              >
                                {isOperationInProgress(miner.id, "refresh") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("refresh")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSSHOperation(miner.id, "mac", "stop")}
                                disabled={isOperationInProgress(miner.id, "stop")}
                                className={`bg-white ${getOperationColor("stop")} p-1.5`}
                                title="Stop Miner"
                              >
                                {isOperationInProgress(miner.id, "stop") ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  getOperationIcon("stop")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openSSHConfig(miner.id, "mac")}
                                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 p-1.5"
                                title="SSH Config"
                              >
                                <Terminal className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditMiner("mac", miner.id)}
                                className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 p-1.5"
                                title="Edit Miner"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerDeleteMiner("mac", miner.id)}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                                title="Remove Miner"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.uptime}</div>
                            <div className="text-xs text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-xs sm:text-sm font-medium ${miner.status === "running" ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {miner.status === "running" ? (
                                <Wifi className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                              ) : (
                                <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                              )}
                            </div>
                            <div className="text-xs text-gray-600">Connection</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Miner Dialog */}
        <Dialog open={showEditMinerDialog} onOpenChange={setShowEditMinerDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Edit Miner</DialogTitle>
              <DialogDescription className="text-gray-600">
                Modify the details of your {editMinerConfig.type === "runpod" ? "Runpod" : "Mac"} miner
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-miner-name" className="text-gray-700">
                  Miner Name
                </Label>
                <Input
                  id="edit-miner-name"
                  value={editMinerConfig.name}
                  onChange={(e) => setEditMinerConfig((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter miner name..."
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              {editMinerConfig.type === "runpod" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-gpu" className="text-gray-700">
                      GPU Model
                    </Label>
                    <Select
                      value={editMinerConfig.gpu}
                      onValueChange={(value) => setEditMinerConfig((prev) => ({ ...prev, gpu: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select GPU" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="RTX 4090">RTX 4090</SelectItem>
                        <SelectItem value="RTX 4080">RTX 4080</SelectItem>
                        <SelectItem value="RTX 3090">RTX 3090</SelectItem>
                        <SelectItem value="RTX 3080">RTX 3080</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-region" className="text-gray-700">
                      Region
                    </Label>
                    <Select
                      value={editMinerConfig.region}
                      onValueChange={(value) => setEditMinerConfig((prev) => ({ ...prev, region: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="US-West">US West</SelectItem>
                        <SelectItem value="US-East">US East</SelectItem>
                        <SelectItem value="EU-Central">EU Central</SelectItem>
                        <SelectItem value="Asia-Pacific">Asia Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-cpu" className="text-gray-700">
                      CPU Model
                    </Label>
                    <Select
                      value={editMinerConfig.cpu}
                      onValueChange={(value) => setEditMinerConfig((prev) => ({ ...prev, cpu: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select CPU" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="M3 Pro">M3 Pro</SelectItem>
                        <SelectItem value="M3 Max">M3 Max</SelectItem>
                        <SelectItem value="M2 Ultra">M2 Ultra</SelectItem>
                        <SelectItem value="M2 Pro">M2 Pro</SelectItem>
                        <SelectItem value="M1">M1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-cores" className="text-gray-700">
                        CPU Cores
                      </Label>
                      <Input
                        id="edit-cores"
                        type="number"
                        value={editMinerConfig.cores}
                        onChange={(e) => setEditMinerConfig((prev) => ({ ...prev, cores: e.target.value }))}
                        placeholder="8"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-memory" className="text-gray-700">
                        Memory
                      </Label>
                      <Input
                        id="edit-memory"
                        value={editMinerConfig.memory}
                        onChange={(e) => setEditMinerConfig((prev) => ({ ...prev, memory: e.target.value }))}
                        placeholder="16GB"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditMinerDialog(false)}
                className="bg-white border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditMiner}
                disabled={!editMinerConfig.name.trim()}
                className={getThemeClasses(viewMode).button}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SSH Configuration Dialog */}
        <Dialog open={showSSHConfigDialog} onOpenChange={setShowSSHConfigDialog}>
          <DialogContent className="bg-white border-gray-200 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                SSH Configuration - {selectedMinerForSSH?.name}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Configure SSH connection settings for remote miner operations
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ssh-host" className="text-gray-700">
                    Host/IP Address
                  </Label>
                  <Input
                    id="ssh-host"
                    value={sshConfig.host}
                    onChange={(e) => setSSHConfig((prev) => ({ ...prev, host: e.target.value }))}
                    placeholder="192.168.1.100 or hostname"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ssh-port" className="text-gray-700">
                    Port
                  </Label>
                  <Input
                    id="ssh-port"
                    type="number"
                    value={sshConfig.port}
                    onChange={(e) => setSSHConfig((prev) => ({ ...prev, port: Number.parseInt(e.target.value) || 22 }))}
                    placeholder="22"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh-username" className="text-gray-700">
                  Username
                </Label>
                <Input
                  id="ssh-username"
                  value={sshConfig.username}
                  onChange={(e) => setSSHConfig((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="root or admin"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh-password" className="text-gray-700">
                  Password (Optional - use private key for better security)
                </Label>
                <Input
                  id="ssh-password"
                  type="password"
                  value={sshConfig.password}
                  onChange={(e) => setSSHConfig((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="SSH password"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh-private-key" className="text-gray-700">
                  Private Key (Recommended)
                </Label>
                <Textarea
                  id="ssh-private-key"
                  value={sshConfig.privateKey}
                  onChange={(e) => setSSHConfig((prev) => ({ ...prev, privateKey: e.target.value }))}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  className="bg-white border-gray-300 text-gray-900 font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh-working-dir" className="text-gray-700">
                  Working Directory
                </Label>
                <Input
                  id="ssh-working-dir"
                  value={sshConfig.workingDirectory}
                  onChange={(e) => setSSHConfig((prev) => ({ ...prev, workingDirectory: e.target.value }))}
                  placeholder="/home/user/miner"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh-process-name" className="text-gray-700">
                  Process Name
                </Label>
                <Input
                  id="ssh-process-name"
                  value={sshConfig.processName}
                  onChange={(e) => setSSHConfig((prev) => ({ ...prev, processName: e.target.value }))}
                  placeholder="bip38_miner"
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              {/* SSH Commands Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">SSH Commands Preview</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div>
                    <span className="text-green-600">Continue:</span>{" "}
                    <span className="text-gray-700">
                      cd {sshConfig.workingDirectory} && ./{sshConfig.processName} --resume
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-600">Refresh:</span>{" "}
                    <span className="text-gray-700">
                      cd {sshConfig.workingDirectory} && pkill {sshConfig.processName} && ./{sshConfig.processName}
                    </span>
                  </div>
                  <div>
                    <span className="text-red-600">Stop:</span>{" "}
                    <span className="text-gray-700">pkill {sshConfig.processName}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSSHConfigDialog(false)}
                className="bg-white border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={saveSSHConfig}
                disabled={!sshConfig.host || !sshConfig.username}
                className={getThemeClasses(viewMode).button}
              >
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmDialog.show}
          onOpenChange={(open) => setDeleteConfirmDialog((prev) => ({ ...prev, show: open }))}
        >
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Remove Miner
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to remove "{deleteConfirmDialog.minerName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium">Warning:</span>
                </div>
                <p className="text-red-600 text-sm mt-1">
                  Removing this miner will stop all current operations and remove it from your fleet permanently.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmDialog((prev) => ({ ...prev, show: false }))}
                className="bg-white border-gray-300"
              >
                Cancel
              </Button>
              <Button onClick={deleteMiner} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Miner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
