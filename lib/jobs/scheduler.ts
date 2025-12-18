import { prisma } from "@/lib/prisma"
import { automationQueue } from "./queue"
import { toZonedTime, format } from "date-fns-tz"
import { startOfDay, endOfDay, getDay } from "date-fns"

/**
 * Check all enabled schedules and queue jobs for current time
 * This should be called every minute
 */
export async function checkSchedules() {
  try {
    const now = new Date()

    // Fetch all enabled schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        enabled: true,
      },
      include: {
        user: {
          include: {
            timeTrackerConfig: true,
          },
        },
      },
    })

    console.log(`[Scheduler] ========================================`)
    console.log(`[Scheduler] Server time: ${now.toISOString()}`)
    console.log(`[Scheduler] Found ${schedules.length} enabled schedule(s)`)
    console.log(`[Scheduler] ========================================`)

    for (const schedule of schedules) {
      // Convert current time to user's timezone using date-fns-tz
      const userNow = toZonedTime(now, schedule.timezone)

      const currentHour = userNow.getHours()
      const currentMinute = userNow.getMinutes()
      const dayOfWeek = getDay(userNow) // 0 = Sunday, 6 = Saturday

      const userTimeFormatted = format(userNow, 'EEEE HH:mm', { timeZone: schedule.timezone })

      console.log(`[Scheduler] Checking schedule for user ${schedule.userId}:`)
      console.log(`[Scheduler]   - User timezone: ${schedule.timezone}`)
      console.log(`[Scheduler]   - Current time in user TZ: ${userTimeFormatted}`)
      console.log(`[Scheduler]   - Time In: ${schedule.timeInHour}:${schedule.timeInMinute.toString().padStart(2, '0')} (${schedule.timeInRandomWindowMinutes}min window)`)
      console.log(`[Scheduler]   - Time Out: ${schedule.timeOutHour}:${schedule.timeOutMinute.toString().padStart(2, '0')} (${schedule.timeOutRandomWindowMinutes}min window)`)

      // Check if weekend and skipWeekends is enabled
      if (schedule.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        console.log(`[Scheduler]   ⊘ Skipping: Weekend (skipWeekends enabled)`)
        continue
      }

      // Check if today is in excluded dates (using user's timezone)
      const todayStart = startOfDay(userNow)
      const todayEnd = endOfDay(userNow)

      const excludedDate = await prisma.excludedDate.findFirst({
        where: {
          userId: schedule.userId,
          date: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      })

      if (excludedDate) {
        console.log(`[Scheduler]   ⊘ Skipping: Excluded date (${excludedDate.reason})`)
        continue
      }

      // Check if user has time tracker config
      if (!schedule.user.timeTrackerConfig) {
        console.log(`[Scheduler]   ⊘ Skipping: No time tracker config`)
        continue
      }

      // Check TIME IN window
      const timeInStart = schedule.timeInHour * 60 + schedule.timeInMinute
      const timeInEnd = timeInStart + schedule.timeInRandomWindowMinutes
      const currentTime = currentHour * 60 + currentMinute

      console.log(`[Scheduler]   - TIME_IN window: ${timeInStart}-${timeInEnd}, current: ${currentTime}`)

      if (currentTime >= timeInStart && currentTime < timeInEnd) {
        console.log(`[Scheduler]   ✓ IN TIME_IN WINDOW!`)
        // Check if we already queued a job for this user in the last 12 hours
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
        const existingLog = await prisma.timeLog.findFirst({
          where: {
            userId: schedule.userId,
            action: "TIME_IN",
            createdAt: {
              gte: twelveHoursAgo,
            },
          },
        })

        if (existingLog) {
          console.log(`[Scheduler]   ⊘ Already executed TIME_IN in last 12 hours, skipping (found log from ${existingLog.createdAt.toLocaleTimeString()})`)
        }

        if (!existingLog) {
          // Calculate random delay within remaining window
          const remainingMinutes = timeInEnd - currentTime
          const randomDelay = Math.floor(Math.random() * remainingMinutes * 60 * 1000)

          const scheduledTime = new Date()
          const actualTime = new Date(scheduledTime.getTime() + randomDelay)

          console.log(`[Scheduler]   → Queuing TIME_IN job (delay: ${Math.round(randomDelay / 1000)}s)`)

          // Create TimeLog entry immediately with PENDING status
          const timeLog = await prisma.timeLog.create({
            data: {
              userId: schedule.userId,
              action: "TIME_IN",
              scheduledTime,
              actualTime,
              status: "PENDING",
            },
          })

          await automationQueue.add(
            "automation-job",
            {
              userId: schedule.userId,
              action: "TIME_IN",
              scheduledTime,
              timeLogId: timeLog.id, // Pass the TimeLog ID to update later
            },
            {
              delay: randomDelay,
            }
          )

          console.log(`[Scheduler]   ✓ Created TimeLog entry (ID: ${timeLog.id})`)
        }
      } else {
        console.log(`[Scheduler]   ⊘ Not in TIME_IN window`)
      }

      // Check TIME OUT window
      const timeOutStart = schedule.timeOutHour * 60 + schedule.timeOutMinute
      const timeOutEnd = timeOutStart + schedule.timeOutRandomWindowMinutes

      console.log(`[Scheduler]   - TIME_OUT window: ${timeOutStart}-${timeOutEnd}, current: ${currentTime}`)

      if (currentTime >= timeOutStart && currentTime < timeOutEnd) {
        console.log(`[Scheduler]   ✓ IN TIME_OUT WINDOW!`)
        // Check if we already queued a job for this user in the last 12 hours
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
        const existingLog = await prisma.timeLog.findFirst({
          where: {
            userId: schedule.userId,
            action: "TIME_OUT",
            createdAt: {
              gte: twelveHoursAgo,
            },
          },
        })

        if (existingLog) {
          console.log(`[Scheduler]   ⊘ Already executed TIME_OUT in last 12 hours, skipping (found log from ${existingLog.createdAt.toLocaleTimeString()})`)
        }

        if (!existingLog) {
          // Calculate random delay within remaining window
          const remainingMinutes = timeOutEnd - currentTime
          const randomDelay = Math.floor(Math.random() * remainingMinutes * 60 * 1000)

          const scheduledTime = new Date()
          const actualTime = new Date(scheduledTime.getTime() + randomDelay)

          console.log(`[Scheduler]   → Queuing TIME_OUT job (delay: ${Math.round(randomDelay / 1000)}s)`)

          // Create TimeLog entry immediately with PENDING status
          const timeLog = await prisma.timeLog.create({
            data: {
              userId: schedule.userId,
              action: "TIME_OUT",
              scheduledTime,
              actualTime,
              status: "PENDING",
            },
          })

          await automationQueue.add(
            "automation-job",
            {
              userId: schedule.userId,
              action: "TIME_OUT",
              scheduledTime,
              timeLogId: timeLog.id, // Pass the TimeLog ID to update later
            },
            {
              delay: randomDelay,
            }
          )

          console.log(`[Scheduler]   ✓ Created TimeLog entry (ID: ${timeLog.id})`)
        }
      } else {
        console.log(`[Scheduler]   ⊘ Not in TIME_OUT window`)
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error:", error)
  }
}

/**
 * Start the scheduler (runs every minute)
 */
export function startScheduler() {
  console.log("[Scheduler] Starting scheduler...")

  // Run immediately
  checkSchedules()

  // Then run every minute
  setInterval(checkSchedules, 60 * 1000)

  console.log("[Scheduler] Scheduler started successfully")
}
