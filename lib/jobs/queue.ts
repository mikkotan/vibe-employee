import Queue from "bull"

export interface AutomationJobData {
  userId: string
  action: "TIME_IN" | "TIME_OUT"
  scheduledTime: Date
  timeLogId: string // ID of the TimeLog entry to update
}

// Create Bull queue
export const automationQueue = new Queue<AutomationJobData>("automation", {
  redis: {
    host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
    port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
})

// Log queue events
automationQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

automationQueue.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

automationQueue.on("error", (error) => {
  console.error("Queue error:", error)
})
