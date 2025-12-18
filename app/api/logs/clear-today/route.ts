import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Clear last 12 hours logs (for testing)
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const now = new Date()
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

    const result = await prisma.timeLog.deleteMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: twelveHoursAgo,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.count} log(s) from last 12 hours`,
      count: result.count,
    })
  } catch (error) {
    console.error("Clear logs error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
