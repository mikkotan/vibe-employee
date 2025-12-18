import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Retrieve user's time logs
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {
      userId: session.user.id,
    }

    if (status && (status === "SUCCESS" || status === "FAILED")) {
      where.status = status
    }

    const logs = await prisma.timeLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Logs GET error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
