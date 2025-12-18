"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const triggerAutomation = async (action: "TIME_IN" | "TIME_OUT") => {
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/test/trigger-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to trigger automation")
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
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
            <CardTitle>Test Automation Queue</CardTitle>
            <CardDescription>
              Manually trigger automation jobs to test the Bull queue and worker.
              Make sure the worker is running: <code>npm run worker</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => triggerAutomation("TIME_IN")}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Triggering..." : "Trigger TIME IN"}
                </Button>
                <Button
                  onClick={() => triggerAutomation("TIME_OUT")}
                  disabled={loading}
                  variant="secondary"
                  className="flex-1"
                >
                  {loading ? "Triggering..." : "Trigger TIME OUT"}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">{result.message}</p>
                      <p className="text-sm">Job ID: {result.jobId}</p>
                      <p className="text-sm">
                        Scheduled: {new Date(result.scheduledTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Check the worker terminal for processing logs and the Logs page for results.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-6 rounded-lg border bg-gray-50 p-4">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Make sure Docker is running (Redis)</li>
                  <li>Make sure your config is saved with valid credentials</li>
                  <li>Run the worker: <code className="bg-gray-200 px-1 rounded">npm run worker</code></li>
                  <li>Click one of the buttons above to trigger a job</li>
                  <li>Watch the worker terminal for job processing</li>
                  <li>Check the Logs page to see the result</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
