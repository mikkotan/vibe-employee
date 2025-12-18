"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ConfigPage() {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [hasExistingConfig, setHasExistingConfig] = useState(false)

  const [formData, setFormData] = useState({
    trackerUrl: "",
    trackerUsername: "",
    trackerPassword: "",
    selectorUsername: "",
    selectorPassword: "",
    selectorLoginButton: "",
    selectorTimeInButton: "",
    selectorTimeOutButton: "",
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchConfig()
    }
  }, [status, router])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config")
      const data = await res.json()

      if (data.config) {
        setFormData({
          trackerUrl: data.config.trackerUrl,
          trackerUsername: data.config.trackerUsername,
          trackerPassword: "", // Never populate password
          selectorUsername: data.config.selectorUsername || "",
          selectorPassword: data.config.selectorPassword || "",
          selectorLoginButton: data.config.selectorLoginButton || "",
          selectorTimeInButton: data.config.selectorTimeInButton || "",
          selectorTimeOutButton: data.config.selectorTimeOutButton || "",
        })
        setHasExistingConfig(data.config.hasPassword)
        // Show advanced if selectors are configured
        if (data.config.selectorUsername || data.config.selectorPassword) {
          setShowAdvanced(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch config:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save configuration")
        setLoading(false)
        return
      }

      setSuccess("Configuration saved successfully!")
      setHasExistingConfig(true)
      setLoading(false)

      // Clear password field after saving
      setFormData(prev => ({ ...prev, trackerPassword: "" }))
    } catch (error) {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setError("")
    setSuccess("")
    setTestingConnection(true)

    try {
      const res = await fetch("/api/config/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to connect to time tracker")
        setTestingConnection(false)
        return
      }

      setSuccess("Connection successful! The URL is reachable.")
      setTestingConnection(false)
    } catch (error) {
      setError("Failed to test connection")
      setTestingConnection(false)
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
            <CardTitle>Time Tracker Configuration</CardTitle>
            <CardDescription>
              Configure your time tracking system credentials. Your password will be encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trackerUrl">Time Tracker URL</Label>
                <Input
                  id="trackerUrl"
                  type="url"
                  placeholder="https://timetracker.example.com"
                  value={formData.trackerUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, trackerUrl: e.target.value })
                  }
                  required
                  disabled={loading || testingConnection}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackerUsername">Username</Label>
                <Input
                  id="trackerUsername"
                  type="text"
                  placeholder="your-username"
                  value={formData.trackerUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, trackerUsername: e.target.value })
                  }
                  required
                  disabled={loading || testingConnection}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trackerPassword">
                  Password {hasExistingConfig && "(leave blank to keep current)"}
                </Label>
                <Input
                  id="trackerPassword"
                  type="password"
                  placeholder={hasExistingConfig ? "••••••••" : "your-password"}
                  value={formData.trackerPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, trackerPassword: e.target.value })
                  }
                  required={!hasExistingConfig}
                  disabled={loading || testingConnection}
                />
                <p className="text-xs text-gray-500">
                  Your password will be encrypted using AES-256-GCM before storage
                </p>
              </div>

              {/* Advanced Settings - CSS Selectors */}
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Advanced Settings (Optional)</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? "Hide" : "Show"}
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Specify CSS selectors to locate elements on your time tracker website.
                      Leave blank to use automatic detection.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="selectorUsername">Username Field Selector</Label>
                      <Input
                        id="selectorUsername"
                        type="text"
                        placeholder='input[name="username"], #username, input[type="email"]'
                        value={formData.selectorUsername}
                        onChange={(e) =>
                          setFormData({ ...formData, selectorUsername: e.target.value })
                        }
                        disabled={loading || testingConnection}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selectorPassword">Password Field Selector</Label>
                      <Input
                        id="selectorPassword"
                        type="text"
                        placeholder='input[type="password"], #password'
                        value={formData.selectorPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, selectorPassword: e.target.value })
                        }
                        disabled={loading || testingConnection}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selectorLoginButton">Login Button Selector</Label>
                      <Input
                        id="selectorLoginButton"
                        type="text"
                        placeholder='button[type="submit"], #login-button, .btn-login'
                        value={formData.selectorLoginButton}
                        onChange={(e) =>
                          setFormData({ ...formData, selectorLoginButton: e.target.value })
                        }
                        disabled={loading || testingConnection}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selectorTimeInButton">Time In Button Selector</Label>
                      <Input
                        id="selectorTimeInButton"
                        type="text"
                        placeholder='button:has-text("Clock In"), #time-in, .btn-clock-in'
                        value={formData.selectorTimeInButton}
                        onChange={(e) =>
                          setFormData({ ...formData, selectorTimeInButton: e.target.value })
                        }
                        disabled={loading || testingConnection}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selectorTimeOutButton">Time Out Button Selector</Label>
                      <Input
                        id="selectorTimeOutButton"
                        type="text"
                        placeholder='button:has-text("Clock Out"), #time-out, .btn-clock-out'
                        value={formData.selectorTimeOutButton}
                        onChange={(e) =>
                          setFormData({ ...formData, selectorTimeOutButton: e.target.value })
                        }
                        disabled={loading || testingConnection}
                      />
                    </div>

                    <p className="text-xs text-gray-500">
                      Tip: Use your browser's DevTools (F12) to inspect elements and copy CSS selectors.
                    </p>
                  </div>
                )}
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

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || testingConnection}>
                  {loading ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={
                    loading ||
                    testingConnection ||
                    !formData.trackerUrl ||
                    !formData.trackerUsername ||
                    (!formData.trackerPassword && !hasExistingConfig)
                  }
                >
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
