"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Manila",
  "Australia/Sydney",
]

export default function SchedulePage() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    timeInHour: 14,
    timeInMinute: 50,
    timeInRandomWindowMinutes: 20,
    timeOutHour: 0,
    timeOutMinute: 0,
    timeOutRandomWindowMinutes: 10,
    timezone: "America/New_York",
    enabled: true,
    skipWeekends: true,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchSchedule()
    }
  }, [status, router])

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/schedule")
      const data = await res.json()

      if (data.schedule) {
        setFormData({
          ...data.schedule,
          skipWeekends: data.schedule.skipWeekends ?? true, // Default to true if undefined
        })
      }
    } catch (error) {
      console.error("Failed to fetch schedule:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save schedule")
        setLoading(false)
        return
      }

      setSuccess("Schedule saved successfully!")
      setLoading(false)
    } catch (error) {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const displayMinute = minute.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${period}`
  }

  const calculateTimeRange = (hour: number, minute: number, window: number) => {
    const startTime = formatTime(hour, minute)
    const endMinutes = minute + window
    const endHour = hour + Math.floor(endMinutes / 60)
    const endMinute = endMinutes % 60
    const endTime = formatTime(endHour % 24, endMinute)
    return `${startTime} - ${endTime}`
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
      <div className="mx-auto max-w-2xl">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Automation Schedule</CardTitle>
            <CardDescription>
              Configure when to automatically clock in and out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Time In Section */}
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">Time In</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeInHour">Hour (0-23)</Label>
                    <Input
                      id="timeInHour"
                      type="number"
                      min="0"
                      max="23"
                      value={formData.timeInHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setFormData({ ...formData, timeInHour: isNaN(val) ? 0 : val })
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeInMinute">Minute (0-59)</Label>
                    <Input
                      id="timeInMinute"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.timeInMinute}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setFormData({ ...formData, timeInMinute: isNaN(val) ? 0 : val })
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Random Window: {formData.timeInRandomWindowMinutes} minutes</Label>
                  <Slider
                    value={[formData.timeInRandomWindowMinutes]}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timeInRandomWindowMinutes: value[0] })
                    }
                    max={60}
                    step={1}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Will execute randomly between:{" "}
                    <span className="font-semibold">
                      {calculateTimeRange(
                        formData.timeInHour,
                        formData.timeInMinute,
                        formData.timeInRandomWindowMinutes
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* Time Out Section */}
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">Time Out</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeOutHour">Hour (0-23)</Label>
                    <Input
                      id="timeOutHour"
                      type="number"
                      min="0"
                      max="23"
                      value={formData.timeOutHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setFormData({ ...formData, timeOutHour: isNaN(val) ? 0 : val })
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeOutMinute">Minute (0-59)</Label>
                    <Input
                      id="timeOutMinute"
                      type="number"
                      min="0"
                      max="59"
                      value={formData.timeOutMinute}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        setFormData({ ...formData, timeOutMinute: isNaN(val) ? 0 : val })
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Random Window: {formData.timeOutRandomWindowMinutes} minutes</Label>
                  <Slider
                    value={[formData.timeOutRandomWindowMinutes]}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timeOutRandomWindowMinutes: value[0] })
                    }
                    max={60}
                    step={1}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Will execute randomly between:{" "}
                    <span className="font-semibold">
                      {calculateTimeRange(
                        formData.timeOutHour,
                        formData.timeOutMinute,
                        formData.timeOutRandomWindowMinutes
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* Timezone & Enable */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    disabled={loading}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">
                    Enable automation
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="skipWeekends"
                    checked={formData.skipWeekends}
                    onCheckedChange={(checked) => setFormData({ ...formData, skipWeekends: checked })}
                    disabled={loading}
                  />
                  <Label htmlFor="skipWeekends" className="cursor-pointer">
                    Skip weekends (Saturday & Sunday)
                  </Label>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Schedule"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
