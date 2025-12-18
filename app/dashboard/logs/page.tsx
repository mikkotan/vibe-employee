"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimeLog {
  id: string
  action: string
  scheduledTime: string
  actualTime: string
  status: string
  errorMessage: string | null
  createdAt: string
}

export default function LogsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchLogs()
    }
  }, [status, router, statusFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const res = await fetch(`/api/logs?${params.toString()}`)
      const data = await res.json()

      if (data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const handleClearToday = async () => {
    if (!confirm("Clear all logs from the last 12 hours? This is useful for testing.")) {
      return
    }

    setClearing(true)
    try {
      const res = await fetch("/api/logs/clear-today", {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to clear logs")
        setClearing(false)
        return
      }

      alert(data.message)
      fetchLogs()
    } catch (error) {
      alert("Failed to clear logs")
    } finally {
      setClearing(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Time Logs</CardTitle>
                <CardDescription>
                  View your automation history
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchLogs} variant="outline" size="sm">
                  Refresh
                </Button>
                <Button
                  onClick={handleClearToday}
                  variant="destructive"
                  size="sm"
                  disabled={clearing}
                >
                  {clearing ? "Clearing..." : "Clear Last 12h"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No logs found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Actual Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={log.action === "TIME_IN" ? "default" : "secondary"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(log.scheduledTime)}</TableCell>
                      <TableCell>{formatDate(log.actualTime)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === "SUCCESS" ? "default" : "destructive"}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.errorMessage && (
                          <span className="text-sm text-red-600">{log.errorMessage}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
