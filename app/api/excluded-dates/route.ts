import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Retrieve user's excluded dates
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const excludedDates = await prisma.excludedDate.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({ excludedDates })
  } catch (error) {
    console.error("Excluded dates GET error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST - Add excluded date(s)
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
    const { startDate, endDate, reason } = body

    if (!startDate || !reason) {
      return NextResponse.json(
        { error: "Start date and reason are required" },
        { status: 400 }
      )
    }

    // Parse dates
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = endDate ? new Date(endDate) : new Date(startDate)
    end.setHours(0, 0, 0, 0)

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }

    if (end < start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Create excluded dates for the range
    const datesToCreate = []
    const currentDate = new Date(start)

    while (currentDate <= end) {
      datesToCreate.push({
        userId: session.user.id,
        date: new Date(currentDate),
        reason,
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Create all dates
    await prisma.excludedDate.createMany({
      data: datesToCreate,
      skipDuplicates: true, // Skip if date already excluded
    })

    return NextResponse.json({
      success: true,
      count: datesToCreate.length,
      message: `${datesToCreate.length} date(s) excluded successfully`,
    })
  } catch (error) {
    console.error("Excluded dates POST error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
