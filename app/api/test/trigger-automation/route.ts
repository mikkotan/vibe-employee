import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { automationQueue } from "@/lib/jobs/queue"

/**
 * Manual test endpoint to trigger automation immediately
 * Useful for testing the Bull queue and worker locally
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action || (action !== "TIME_IN" && action !== "TIME_OUT")) {
      return NextResponse.json(
        { error: "Action must be either TIME_IN or TIME_OUT" },
        { status: 400 }
      )
    }

    const scheduledTime = new Date()

    // Add job to queue
    const job = await automationQueue.add("automation-job", {
      userId: session.user.id,
      action,
      scheduledTime,
    })

    return NextResponse.json({
      success: true,
      message: `${action} job queued successfully`,
      jobId: job.id,
      scheduledTime,
    })
  } catch (error: any) {
    console.error("Error triggering automation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to trigger automation" },
      { status: 500 }
    )
  }
}
