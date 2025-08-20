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
  Plus,
  Trash2,
  Eye,
  EyeOff,
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
import { RefreshCw, PowerOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

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
  const [generateAIVariations, setGenerateAIVariations] = useState(false)

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
      setGenerateAIVariations(false)
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
                  className={`flex items-center gap-2 ${getThemeClasses(viewMode).buttonOutline} text-sm`}
                >
                  {showPassphrases ? (
                    <>
                      <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                      Hide Passphrases
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      Show Passphrases
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  className={`flex items-center gap-2 shadow-md text-sm ${getThemeClasses(viewMode).button}`}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  Add Passphrase
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <Input
                type="search"
                placeholder="Search passphrase or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="col-span-1 sm:col-span-2 lg:col-span-4"
              />

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm text-gray-700">
                  Start Date:
                </Label>
                <Input
                  type="date"
                  id="start-date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm text-gray-700">
                  End Date:
                </Label>
                <Input
                  type="date"
                  id="end-date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Passphrase Table */}
            {showPassphrases ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>Passphrase</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPassphrases.length > 0 ? (
                      filteredPassphrases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.id}</TableCell>
                          <TableCell>{p.passphrase}</TableCell>
                          <TableCell>{p.description}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadge(p.status)}`}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>{p.dateAdded}</TableCell>
                          <TableCell>
                            <Badge className={`${getPriorityBadge(p.priority)}`}>{p.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePassphrase(p.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No passphrases found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Passphrases are hidden. Click "Show Passphrases" to view.</p>
              </div>
            )}

            {/* Clear All Button */}
            {passphrases.length > 0 && (
              <div className="flex justify-end mt-4">
                <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex items-center gap-2 shadow-md text-sm">
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      Clear All Passphrases
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900">Confirm Clear All</DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Are you sure you want to clear all passphrases? This action cannot be undone.
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
                      <Button variant="destructive" onClick={handleClearAllPassphrases}>
                        Clear All
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className={getThemeClasses(viewMode).card}>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-gray-900">File Upload</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Upload a file containing passphrases to decrypt
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Drag and drop a file here or click to browse</p>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
            </div>

            {/* LLM Configuration */}
            <div className="mt-4 flex items-center gap-2">
              <Checkbox id="generate-variations" checked={generateVariations} onCheckedChange={setGenerateVariations} />
              <Label htmlFor="generate-variations" className="text-sm text-gray-700">
                Generate Phrase Variations with AI
              </Label>
            </div>

            {generateVariations && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowLLMConfig(true)}
                  className="flex items-center gap-2 shadow-md text-sm"
                >
                  <Terminal className="w-3 h-3 sm:w-4 sm:h-4" />
                  Configure AI
                </Button>
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} - {file.uploadDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadProgress.find((p) => p.fileId === file.id) && (
                          <>
                            {uploadProgress.find((p) => p.fileId === file.id)!.status === "uploading" && (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            )}
                            {uploadProgress.find((p) => p.fileId === file.id)!.status === "complete" && (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            )}
                            {uploadProgress.find((p) => p.fileId === file.id)!.status === "error" && (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUploadedFile(file.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                  Manage your miners and their configurations
                </CardDescription>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddMinerDialog(true)}
                className={`flex items-center gap-2 shadow-md text-sm ${getThemeClasses(viewMode).button}`}
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                Add Miner
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <Tabs defaultValue="mac" className="space-y-4">
              <TabsList>
                <TabsTrigger value="mac">Mac Miners</TabsTrigger>
                <TabsTrigger value="runpod">Runpod Miners</TabsTrigger>
              </TabsList>
              <TabsContent value="mac">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hash Rate</TableHead>
                        <TableHead>CPU</TableHead>
                        <TableHead>Cores</TableHead>
                        <TableHead>Memory</TableHead>
                        <TableHead>Uptime</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {miners.mac.length > 0 ? (
                        miners.mac.map((miner) => (
                          <TableRow key={miner.id}>
                            <TableCell className="font-medium">{miner.id}</TableCell>
                            <TableCell>{miner.name}</TableCell>
                            <TableCell>
                              <Badge className={`${getMinerStatusBadge(miner.status)}`}>{miner.status}</Badge>
                            </TableCell>
                            <TableCell>{miner.hashRate}</TableCell>
                            <TableCell>{miner.cpu}</TableCell>
                            <TableCell>{miner.cores}</TableCell>
                            <TableCell>{miner.memory}</TableCell>
                            <TableCell>{miner.uptime}</TableCell>
                            <TableCell>{miner.temperature}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMinerAction("mac", miner.id, "start")}
                                  disabled={miner.status === "running"}
                                  className={`h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 ${
                                    miner.status === "running" ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMinerAction("mac", miner.id, "stop")}
                                  disabled={miner.status === "stopped"}
                                  className={`h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                                    miner.status === "stopped" ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMinerAction("mac", miner.id, "restart")}
                                  className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openSSHConfig(miner.id, "mac")}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Terminal className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditMiner("mac", miner.id)}
                                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => triggerDeleteMiner("mac", miner.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-4">
                            No Mac miners found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="runpod">
                <div>Runpod Miners</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Add New Passphrase</DialogTitle>
              <DialogDescription className="text-gray-600">
                Enter the passphrase and description to add to the database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="passphrase" className="text-right">
                  Passphrase
                </Label>
                <Input
                  type="text"
                  id="passphrase"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="generate-ai-variations"
                  checked={generateAIVariations}
                  onCheckedChange={setGenerateAIVariations}
                />
                <Label htmlFor="generate-ai-variations" className="text-sm text-gray-700">
                  Generate AI Variations
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-white border-gray-300">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddPassphrase}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSSHConfigDialog} onOpenChange={setShowSSHConfigDialog}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">SSH Configuration</DialogTitle>
              <DialogDescription className="text-gray-600">
                Configure the SSH settings for the selected miner.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="host" className="text-right">
                  Host
                </Label>
                <Input
                  type="text"
                  id="host"
                  value={sshConfig.host}
                  onChange={(e) => setSSHConfig({ ...sshConfig, host: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="port" className="text-right">
                  Port
                </Label>
                <Input
                  type="number"
                  id="port"
                  value={sshConfig.port}
                  onChange={(e) => setSSHConfig({ ...sshConfig, port: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  type="text"
                  id="username"
                  value={sshConfig.username}
                  onChange={(e) => setSSHConfig({ ...sshConfig, username: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={sshConfig.password || ""}
                  onChange={(e) => setSSHConfig({ ...sshConfig, password: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="privateKey" className="text-right">
                  Private Key
                </Label>
                <Textarea
                  id="privateKey"
                  value={sshConfig.privateKey || ""}
                  onChange={(e) => setSSHConfig({ ...sshConfig, privateKey: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="workingDirectory" className="text-right">
                  Working Directory
                </Label>
                <Input
                  type="text"
                  id="workingDirectory"
                  value={sshConfig.workingDirectory}
                  onChange={(e) => setSSHConfig({ ...sshConfig, workingDirectory: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="processName" className="text-right">
                  Process Name
                </Label>
                <Input
                  type="text"
                  id="processName"
                  value={sshConfig.processName}
                  onChange={(e) => setSSHConfig({ ...sshConfig, processName: e.target.value })}
                  className="col-span-3"
                />
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
              <Button variant="primary" onClick={saveSSHConfig}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddMinerDialog} onOpenChange={setShowAddMinerDialog}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Add New Miner</DialogTitle>
              <DialogDescription className="text-gray-600">Configure the settings for the new miner.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minerType" className="text-right">
                  Miner Type
                </Label>
                <Select value={newMinerType} onValueChange={setNewMinerType}>
                  <SelectTrigger className="w-[180px] col-span-3">
                    <SelectValue placeholder="Select Miner Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="runpod">Runpod</SelectItem>
                    <SelectItem value="mac">Mac</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minerName" className="text-right">
                  Miner Name
                </Label>
                <Input
                  type="text"
                  id="minerName"
                  value={newMinerConfig.name}
                  onChange={(e) => setNewMinerConfig({ ...newMinerConfig, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              {newMinerType === "runpod" ? (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gpu" className="text-right">
                      GPU
                    </Label>
                    <Input
                      type="text"
                      id="gpu"
                      value={newMinerConfig.gpu}
                      onChange={(e) => setNewMinerConfig({ ...newMinerConfig, gpu: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="region" className="text-right">
                      Region
                    </Label>
                    <Input
                      type="text"
                      id="region"
                      value={newMinerConfig.region}
                      onChange={(e) => setNewMinerConfig({ ...newMinerConfig, region: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cpu" className="text-right">
                      CPU
                    </Label>
                    <Input
                      type="text"
                      id="cpu"
                      value={newMinerConfig.cpu}
                      onChange={(e) => setNewMinerConfig({ ...newMinerConfig, cpu: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cores" className="text-right">
                      Cores
                    </Label>
                    <Input
                      type="number"
                      id="cores"
                      value={newMinerConfig.cores}
                      onChange={(e) => setNewMinerConfig({ ...newMinerConfig, cores: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="memory" className="text-right">
                      Memory
                    </Label>
                    <Input
                      type="text"
                      id="memory"
                      value={newMinerConfig.memory}
                      onChange={(e) => setNewMinerConfig({ ...newMinerConfig, memory: e.target.value })}
                      className="col-span-3"
                    />
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
              <Button variant="primary" onClick={handleAddMiner}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditMinerDialog} onOpenChange={setShowEditMinerDialog}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Edit Miner</DialogTitle>
              <DialogDescription className="text-gray-600">Edit the settings for the selected miner.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minerName" className="text-right">
                  Miner Name
                </Label>
                <Input
                  type="text"
                  id="minerName"
                  value={editMinerConfig.name}
                  onChange={(e) => setEditMinerConfig({ ...editMinerConfig, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              {editMinerConfig.type === "runpod" ? (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gpu" className="text-right">
                      GPU
                    </Label>
                    <Input
                      type="text"
                      id="gpu"
                      value={editMinerConfig.gpu}
                      onChange={(e) => setEditMinerConfig({ ...editMinerConfig, gpu: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="region" className="text-right">
                      Region
                    </Label>
                    <Input
                      type="text"
                      id="region"
                      value={editMinerConfig.region}
                      onChange={(e) => setEditMinerConfig({ ...editMinerConfig, region: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cpu" className="text-right">
                      CPU
                    </Label>
                    <Input
                      type="text"
                      id="cpu"
                      value={editMinerConfig.cpu}
                      onChange={(e) => setEditMinerConfig({ ...editMinerConfig, cpu: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cores" className="text-right">
                      Cores
                    </Label>
                    <Input
                      type="number"
                      id="cores"
                      value={editMinerConfig.cores}
                      onChange={(e) => setEditMinerConfig({ ...editMinerConfig, cores: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="memory" className="text-right">
                      Memory
                    </Label>
                    <Input
                      type="text"
                      id="memory"
                      value={editMinerConfig.memory}
                      onChange={(e) => setEditMinerConfig({ ...editMinerConfig, memory: e.target.value })}
                      className="col-span-3"
                    />
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
              <Button variant="primary" onClick={handleEditMiner}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteConfirmDialog.show}
          onOpenChange={(open) => setDeleteConfirmDialog({ ...deleteConfirmDialog, show: open })}
        >
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Confirm Delete</DialogTitle>
              <DialogDescription className="text-gray-600">
                Are you sure you want to delete {deleteConfirmDialog.minerName}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmDialog({ ...deleteConfirmDialog, show: false })}
                className="bg-white border-gray-300"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteMiner}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showLLMConfig} onOpenChange={setShowLLMConfig}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">LLM Configuration</DialogTitle>
              <DialogDescription className="text-gray-600">Configure the settings for the LLM.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">
                  Provider
                </Label>
                <Select
                  value={llmConfig.provider}
                  onValueChange={(value) => setLLMConfig({ ...llmConfig, provider: value as "openai" })}
                >
                  <SelectTrigger className="w-[180px] col-span-3">
                    <SelectValue placeholder="Select Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiKey" className="text-right">
                  API Key
                </Label>
                <Input
                  type="text"
                  id="apiKey"
                  value={llmConfig.apiKey}
                  onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  Model
                </Label>
                <Input
                  type="text"
                  id="model"
                  value={llmConfig.model}
                  onChange={(e) => setLLMConfig({ ...llmConfig, model: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="temperature" className="text-right">
                  Temperature
                </Label>
                <Input
                  type="number"
                  id="temperature"
                  value={llmConfig.temperature}
                  onChange={(e) => setLLMConfig({ ...llmConfig, temperature: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minWords" className="text-right">
                  Min Words
                </Label>
                <Input
                  type="number"
                  id="minWords"
                  value={llmConfig.minWords}
                  onChange={(e) => setLLMConfig({ ...llmConfig, minWords: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxWords" className="text-right">
                  Max Words
                </Label>
                <Input
                  type="number"
                  id="maxWords"
                  value={llmConfig.maxWords}
                  onChange={(e) => setLLMConfig({ ...llmConfig, maxWords: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phrasesPerRow" className="text-right">
                  Phrases Per Row
                </Label>
                <Input
                  type="number"
                  id="phrasesPerRow"
                  value={llmConfig.phrasesPerRow}
                  onChange={(e) => setLLMConfig({ ...llmConfig, phrasesPerRow: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="seedWords" className="text-right">
                  Seed Words
                </Label>
                <Textarea
                  id="seedWords"
                  value={llmConfig.seedWords}
                  onChange={(e) => setLLMConfig({ ...llmConfig, seedWords: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLLMConfig(false)} className="bg-white border-gray-300">
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setShowLLMConfig(false)}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
