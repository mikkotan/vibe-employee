import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Remove a specific excluded date
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params

    // Verify the excluded date belongs to the user
    const excludedDate = await prisma.excludedDate.findUnique({
      where: { id },
    })

    if (!excludedDate) {
      return NextResponse.json(
        { error: "Excluded date not found" },
        { status: 404 }
      )
    }

    if (excludedDate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Delete the excluded date
    await prisma.excludedDate.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Excluded date removed successfully",
    })
  } catch (error) {
    console.error("Excluded date DELETE error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
