import "dotenv/config"
import { automationQueue } from "./lib/jobs/queue"
import { startScheduler } from "./lib/jobs/scheduler"
import { performAutomation } from "./lib/automation/puppeteer"

console.log("========================================")
console.log("LockLock Worker Starting...")
console.log("========================================")

// Process automation jobs
automationQueue.process("automation-job", async (job) => {
  console.log(`[Worker] Processing job ${job.id}:`, job.data)

  const { userId, action, scheduledTime, timeLogId } = job.data

  try {
    const result = await performAutomation(userId, action, new Date(scheduledTime), timeLogId)

    if (!result.success) {
      throw new Error(result.errorMessage || "Automation failed")
    }

    console.log(`[Worker] Job ${job.id} completed successfully`)
    return result
  } catch (error: any) {
    console.error(`[Worker] Job ${job.id} failed:`, error.message)
    throw error
  }
})

// Start the scheduler
startScheduler()

console.log("[Worker] Worker is running and processing jobs...")
console.log("========================================")

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Received SIGTERM, shutting down gracefully...")
  await automationQueue.close()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("[Worker] Received SIGINT, shutting down gracefully...")
  await automationQueue.close()
  process.exit(0)
})
