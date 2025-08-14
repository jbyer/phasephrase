"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play } from "lucide-react"
import { RefreshCw, PowerOff } from "lucide-react"

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
    passphrasesToRun: 2847,
    totalPassphrases: 10000,
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

  const [generateVariations, setGenerateVariations] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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

  const simulateFileUpload = async (file: File): Promise<void> => {
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

    // Simulate upload progress
    const progressUpdate: FileUploadProgress = {
      fileId,
      progress: 0,
      status: "uploading",
    }

    setUploadProgress((prev) => [...prev, progressUpdate])

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, progress } : p)))
      }

      // Simulate file processing
      setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, status: "processing" } : p)))

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Simulate successful completion
      const processedCount = Math.floor(Math.random() * 1000) + 100

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "success",
                processedCount,
              }
            : f,
        ),
      )

      setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, status: "complete" } : p)))

      // Update dashboard data
      setDashboardData((prev) => ({
        ...prev,
        totalPassphrases: prev.totalPassphrases + processedCount,
        passphrasesToRun: prev.passphrasesToRun + processedCount,
      }))

      setUploadAlert({
        type: "success",
        message: `Successfully uploaded and processed ${file.name}. Added ${processedCount} passphrases.`,
      })
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                errorMessage: "Upload failed. Please try again.",
              }
            : f,
        ),
      )

      setUploadProgress((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, status: "error" } : p)))

      setUploadAlert({
        type: "error",
        message: `Failed to upload ${file.name}. Please try again.`,
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

    await simulateFileUpload(file)
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

  const handleAddPassphrase = async () => {
    if (newPassphrase.trim()) {
      setIsGenerating(true)

      try {
        // Always add the original passphrase first
        const originalEntry = {
          id: passphrases.length + 1,
          passphrase: newPassphrase.trim(),
          description: newDescription.trim() || "Original passphrase",
          status: "pending",
          dateAdded: new Date().toISOString().split("T")[0],
          priority: "Medium",
        }

        const newEntries = [originalEntry]
        let totalAdded = 1

        // Generate variations if requested
        if (generateVariations) {
          try {
            const response = await fetch("/api/generate-phrases", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                basePhrase: newPassphrase.trim(),
                numVariations: 3,
                minWords: 3,
                maxWords: 12,
                temperature: 0.7,
                useAzure: false, // Can be made configurable
              }),
            })

            if (response.ok) {
              const data = await response.json()

              // Add generated variations
              data.generatedPhrases.forEach((generated: any, index: number) => {
                newEntries.push({
                  id: passphrases.length + totalAdded + 1,
                  passphrase: generated.phrase,
                  description: generated.description,
                  status: "pending",
                  dateAdded: new Date().toISOString().split("T")[0],
                  priority: "Medium",
                })
                totalAdded++
              })
            }
          } catch (error) {
            console.error("Error generating phrase variations:", error)
            // Continue with just the original phrase if generation fails
          }
        }

        // Add all entries to the list
        setPassphrases([...passphrases, ...newEntries])
        setNewPassphrase("")
        setNewDescription("")
        setGenerateVariations(false)
        setShowAddDialog(false)

        // Update dashboard data
        setDashboardData((prev) => ({
          ...prev,
          totalPassphrases: prev.totalPassphrases + totalAdded,
          passphrasesToRun: prev.passphrasesToRun + totalAdded,
        }))
      } finally {
        setIsGenerating(false)
      }
    }
  }

  return <div>{/* Main content here */}</div>
}
