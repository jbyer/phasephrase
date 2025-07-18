"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Database, Clock, Zap, Play, Pause, RotateCcw, Shield, Key } from "lucide-react"
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
import { Search, Plus, Trash2, Eye, EyeOff, Download, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Server, Monitor, Wifi, WifiOff, RefreshCw, PowerOff, BellRing } from "lucide-react"

export default function Component() {
  const [isRunning, setIsRunning] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

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
    runpod: [
      {
        id: "rp-001",
        name: "Runpod-GPU-1",
        status: "running",
        hashRate: "850 KH/s",
        gpu: "RTX 4090",
        region: "US-West",
        cost: "$0.89/hr",
        uptime: "2h 34m",
        temperature: "72°C",
      },
      {
        id: "rp-002",
        name: "Runpod-GPU-2",
        status: "running",
        hashRate: "820 KH/s",
        gpu: "RTX 4090",
        region: "EU-Central",
        cost: "$0.89/hr",
        uptime: "1h 45m",
        temperature: "68°C",
      },
      {
        id: "rp-003",
        name: "Runpod-GPU-3",
        status: "stopped",
        hashRate: "0 KH/s",
        gpu: "RTX 4080",
        region: "US-East",
        cost: "$0.00/hr",
        uptime: "0m",
        temperature: "N/A",
      },
    ],
    mac: [
      {
        id: "mac-001",
        name: "MacBook Pro M3",
        status: "running",
        hashRate: "245 KH/s",
        cpu: "M3 Pro",
        cores: 12,
        memory: "18GB",
        uptime: "4h 12m",
        temperature: "45°C",
      },
      {
        id: "mac-002",
        name: "Mac Studio M2",
        status: "running",
        hashRate: "380 KH/s",
        cpu: "M2 Ultra",
        cores: 24,
        memory: "64GB",
        uptime: "6h 28m",
        temperature: "52°C",
      },
      {
        id: "mac-003",
        name: "iMac M1",
        status: "idle",
        hashRate: "0 KH/s",
        cpu: "M1",
        cores: 8,
        memory: "16GB",
        uptime: "0m",
        temperature: "38°C",
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

  const [selectedAlert, setSelectedAlert] = useState<any | null>(null)
  const [showAlertDetailsDialog, setShowAlertDetailsDialog] = useState(false)

  useEffect(() => {
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
  }, [isRunning])

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
            }

      setMiners((prev) => ({
        ...prev,
        [newMinerType]: [...prev[newMinerType], newMiner],
      }))

      setNewMinerConfig({ name: "", gpu: "", region: "", cpu: "", cores: "", memory: "" })
      setShowAddMinerDialog(false)
    }
  }

  const handleDeleteMiner = (type: "runpod" | "mac", minerId: string) => {
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
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
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
  }

  const handleAlertClick = (alert: any) => {
    setSelectedAlert(alert)
    setShowAlertDetailsDialog(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <span className="break-words">Passphrase Decryption Dashboard</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Real-time monitoring of passphrase decryption operations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <Badge
              variant={isRunning ? "default" : "secondary"}
              className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 border-blue-200 text-xs sm:text-sm"
            >
              {isRunning ? "RUNNING" : "PAUSED"}
            </Badge>
            <div className="text-gray-500 text-xs sm:text-sm">{currentTime.toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Control Panel */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? "destructive" : "default"}
                  className="flex items-center gap-2 shadow-md text-sm"
                  size="sm"
                >
                  {isRunning ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50 text-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {/* Miners Working */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Active Miners</CardTitle>
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{dashboardData.minersWorking}</div>
              <p className="text-xs text-gray-600 mt-1">Currently processing</p>
              <div className="flex items-center mt-2">
                <div className="flex space-x-1">
                  {Array.from({ length: dashboardData.minersWorking }).map((_, i) => (
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
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
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

          {/* Total Database */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Database</CardTitle>
              <Database className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {dashboardData.totalPassphrases.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600 mt-1">Total passphrases</p>
              <div className="mt-2 text-xs text-gray-600">
                Processed: {(dashboardData.totalPassphrases - dashboardData.passphrasesToRun).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Days Remaining */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
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

          {/* Recent System Alerts */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 col-span-1 sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Recent System Alerts</CardTitle>
              <BellRing className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {dashboardData.recentAlerts.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.recentAlerts.slice(0, 3).map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 -mx-1 rounded-md transition-colors"
                      onClick={() => handleAlertClick(alert)}
                    >
                      <Badge
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          alert.type === "Error"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : alert.type === "Warning"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                              : "bg-blue-100 text-blue-700 border-blue-200"
                        }`}
                      >
                        {alert.type}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-xs text-gray-800 leading-tight">{alert.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(alert.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-600">No recent alerts.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">Decryption Progress</CardTitle>
            <CardDescription className="text-gray-600">Overall progress and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900">{progressPercentage.toFixed(2)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4">
              <div className="text-center">
                <div className="text-base sm:text-lg font-semibold text-gray-900">
                  {(dashboardData.totalPassphrases - dashboardData.passphrasesToRun).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-base sm:text-lg font-semibold text-gray-900">{dashboardData.hashRate}</div>
                <div className="text-xs text-gray-600">Current Rate</div>
              </div>
              <div className="text-center">
                <div className="text-base sm:text-lg font-semibold text-gray-900">{dashboardData.lastSuccess}</div>
                <div className="text-xs text-gray-600">Last Success</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passphrase Management */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
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
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 shadow-md text-xs sm:text-sm">
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
                        className="bg-blue-600 hover:bg-blue-700"
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
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-gray-300 hover:bg-gray-50 text-xs flex-1 sm:flex-none"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Import
                </Button>
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
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900">Miner Management</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Control and monitor your Runpod and Mac miners
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showAddMinerDialog} onOpenChange={setShowAddMinerDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
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
                        className="bg-blue-600 hover:bg-blue-700"
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
            <Tabs defaultValue="runpod" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200">
                <TabsTrigger value="runpod" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                  <Server className="w-4 h-4 mr-2 text-blue-600" />
                  Runpod Miners ({miners.runpod.length})
                </TabsTrigger>
                <TabsTrigger value="mac" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
                  <Monitor className="w-4 h-4 mr-2 text-purple-600" />
                  Mac Miners ({miners.mac.length})
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("runpod", miner.id, "start")}
                                disabled={miner.status === "running"}
                                className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 p-1.5"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("runpod", miner.id, "stop")}
                                disabled={miner.status === "stopped"}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                              >
                                <PowerOff className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("runpod", miner.id, "restart")}
                                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 p-1.5"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteMiner("runpod", miner.id)}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                                title="Remove Miner"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.uptime}</div>
                            <div className="text-xs text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.temperature}</div>
                            <div className="text-xs text-gray-600">Temperature</div>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("mac", miner.id, "start")}
                                disabled={miner.status === "running"}
                                className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 p-1.5"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("mac", miner.id, "stop")}
                                disabled={miner.status === "stopped"}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                              >
                                <PowerOff className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMinerAction("mac", miner.id, "restart")}
                                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 p-1.5"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteMiner("mac", miner.id)}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50 p-1.5"
                                title="Remove Miner"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-3 pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.uptime}</div>
                            <div className="text-xs text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">{miner.temperature}</div>
                            <div className="text-xs text-gray-600">Temperature</div>
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
              <Button onClick={confirmDeleteMiner} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Miner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert Details Dialog */}
        <Dialog open={showAlertDetailsDialog} onOpenChange={setShowAlertDetailsDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                {selectedAlert?.type === "Error" && <BellRing className="w-5 h-5 text-red-600" />}
                {selectedAlert?.type === "Warning" && <BellRing className="w-5 h-5 text-yellow-600" />}
                {selectedAlert?.type === "Info" && <BellRing className="w-5 h-5 text-blue-600" />}
                {selectedAlert?.type} Alert Details
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Detailed information about the selected system alert.
              </DialogDescription>
            </DialogHeader>
            {selectedAlert && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
                  <Label className="text-gray-700 font-medium">Type:</Label>
                  <span className="text-gray-900">{selectedAlert.type}</span>

                  <Label className="text-gray-700 font-medium">Timestamp:</Label>
                  <span className="text-gray-900">
                    {selectedAlert.timestamp.toLocaleString()} ({formatTimeAgo(selectedAlert.timestamp)})
                  </span>

                  <Label className="text-gray-700 font-medium col-span-2">Description:</Label>
                  <p className="text-gray-800 col-span-2">{selectedAlert.description}</p>
                </div>
              </div>
            )}
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
  )
}
