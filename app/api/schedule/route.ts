import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Retrieve user's schedule
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const schedule = await prisma.schedule.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Schedule GET error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST - Save/update user's schedule
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
    const {
      timeInHour,
      timeInMinute,
      timeInRandomWindowMinutes,
      timeOutHour,
      timeOutMinute,
      timeOutRandomWindowMinutes,
      timezone,
      enabled,
      skipWeekends,
    } = body

    // Validation
    if (
      timeInHour === undefined ||
      timeInMinute === undefined ||
      timeInRandomWindowMinutes === undefined ||
      timeOutHour === undefined ||
      timeOutMinute === undefined ||
      timeOutRandomWindowMinutes === undefined ||
      !timezone
    ) {
      return NextResponse.json(
        { error: "All schedule fields are required" },
        { status: 400 }
      )
    }

    // Validate time ranges
    if (
      timeInHour < 0 || timeInHour > 23 ||
      timeInMinute < 0 || timeInMinute > 59 ||
      timeOutHour < 0 || timeOutHour > 23 ||
      timeOutMinute < 0 || timeOutMinute > 59 ||
      timeInRandomWindowMinutes < 0 ||
      timeOutRandomWindowMinutes < 0
    ) {
      return NextResponse.json(
        { error: "Invalid time values" },
        { status: 400 }
      )
    }

    // Upsert schedule (create or update)
    const schedule = await prisma.schedule.upsert({
      where: {
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
        timeInHour: parseInt(timeInHour),
        timeInMinute: parseInt(timeInMinute),
        timeInRandomWindowMinutes: parseInt(timeInRandomWindowMinutes),
        timeOutHour: parseInt(timeOutHour),
        timeOutMinute: parseInt(timeOutMinute),
        timeOutRandomWindowMinutes: parseInt(timeOutRandomWindowMinutes),
        timezone,
        enabled: enabled !== undefined ? enabled : true,
        skipWeekends: skipWeekends !== undefined ? skipWeekends : true,
      },
      update: {
        timeInHour: parseInt(timeInHour),
        timeInMinute: parseInt(timeInMinute),
        timeInRandomWindowMinutes: parseInt(timeInRandomWindowMinutes),
        timeOutHour: parseInt(timeOutHour),
        timeOutMinute: parseInt(timeOutMinute),
        timeOutRandomWindowMinutes: parseInt(timeOutRandomWindowMinutes),
        timezone,
        enabled: enabled !== undefined ? enabled : true,
        skipWeekends: skipWeekends !== undefined ? skipWeekends : true,
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Schedule POST error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
