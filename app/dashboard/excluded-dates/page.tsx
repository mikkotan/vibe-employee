"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"

interface ExcludedDate {
  id: string
  date: string
  reason: string
  createdAt: string
}

const REASONS = [
  "Vacation",
  "Sick Leave",
  "Holiday",
  "Personal Day",
  "Other",
]

export default function ExcludedDatesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [excludedDates, setExcludedDates] = useState<ExcludedDate[]>([])

  // Form state
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reason, setReason] = useState("Vacation")
  const [customReason, setCustomReason] = useState("")
  const [isRange, setIsRange] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchExcludedDates()
    }
  }, [status, router])

  const fetchExcludedDates = async () => {
    try {
      const res = await fetch("/api/excluded-dates")
      const data = await res.json()

      if (data.excludedDates) {
        setExcludedDates(data.excludedDates)
      }
    } catch (error) {
      console.error("Failed to fetch excluded dates:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    if (!startDate) {
      setError("Please select a date")
      setLoading(false)
      return
    }

    try {
      const finalReason = reason === "Other" ? customReason : reason

      if (!finalReason) {
        setError("Please provide a reason")
        setLoading(false)
        return
      }

      const res = await fetch("/api/excluded-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: isRange && endDate ? endDate.toISOString() : startDate.toISOString(),
          reason: finalReason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to add excluded date")
        setLoading(false)
        return
      }

      setSuccess(data.message)
      setStartDate(undefined)
      setEndDate(undefined)
      setReason("Vacation")
      setCustomReason("")
      setIsRange(false)
      fetchExcludedDates()
      setLoading(false)
    } catch (error) {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this excluded date?")) {
      return
    }

    try {
      const res = await fetch(`/api/excluded-dates/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        setError("Failed to delete excluded date")
        return
      }

      setSuccess("Excluded date removed successfully")
      fetchExcludedDates()
    } catch (error) {
      setError("Something went wrong")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Group consecutive dates
  const groupedDates = () => {
    if (excludedDates.length === 0) return []

    const sorted = [...excludedDates].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const groups: Array<{ dates: ExcludedDate[], start: string, end: string, reason: string }> = []
    let currentGroup: ExcludedDate[] = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date)
      const currDate = new Date(sorted[i].date)
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

      if (diffDays === 1 && sorted[i].reason === sorted[i - 1].reason) {
        currentGroup.push(sorted[i])
      } else {
        groups.push({
          dates: currentGroup,
          start: currentGroup[0].date,
          end: currentGroup[currentGroup.length - 1].date,
          reason: currentGroup[0].reason,
        })
        currentGroup = [sorted[i]]
      }
    }

    groups.push({
      dates: currentGroup,
      start: currentGroup[0].date,
      end: currentGroup[currentGroup.length - 1].date,
      reason: currentGroup[0].reason,
    })

    return groups
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
      <div className="mx-auto max-w-4xl">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Add New Excluded Date */}
          <Card>
            <CardHeader>
              <CardTitle>Add Excluded Date(s)</CardTitle>
              <CardDescription>
                Specify days when automation should not run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRange"
                      checked={isRange}
                      onChange={(e) => setIsRange(e.target.checked)}
                    />
                    <Label htmlFor="isRange">Date Range</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRange ? "Start Date" : "Date"}</Label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="rounded-md border"
                  />
                </div>

                {isRange && (
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border"
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {reason === "Other" && (
                  <div className="space-y-2">
                    <Label htmlFor="customReason">Custom Reason</Label>
                    <Input
                      id="customReason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Enter reason"
                      required
                    />
                  </div>
                )}

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

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Adding..." : "Add Excluded Date(s)"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* List of Excluded Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Excluded Dates</CardTitle>
              <CardDescription>
                {excludedDates.length} date(s) excluded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {excludedDates.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No excluded dates
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedDates().map((group, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {group.dates.length === 1
                            ? formatDate(group.start)
                            : `${formatDate(group.start)} - ${formatDate(group.end)}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {group.reason}
                          {group.dates.length > 1 && ` (${group.dates.length} days)`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Delete all dates in the group
                          Promise.all(
                            group.dates.map((d) => handleDelete(d.id))
                          ).then(() => {
                            setSuccess("Excluded dates removed successfully")
                            fetchExcludedDates()
                          })
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
