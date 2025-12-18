import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/encryption"

// GET - Retrieve user's config (without exposing password)
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const config = await prisma.timeTrackerConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!config) {
      return NextResponse.json(
        { config: null },
        { status: 200 }
      )
    }

    // Return config without password, only indicate if password exists
    return NextResponse.json({
      config: {
        id: config.id,
        trackerUrl: config.trackerUrl,
        trackerUsername: config.trackerUsername,
        hasPassword: !!config.trackerPasswordEncrypted,
        selectorUsername: config.selectorUsername,
        selectorPassword: config.selectorPassword,
        selectorLoginButton: config.selectorLoginButton,
        selectorTimeInButton: config.selectorTimeInButton,
        selectorTimeOutButton: config.selectorTimeOutButton,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error("Config GET error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// POST - Save/update user's config
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
      trackerUrl,
      trackerUsername,
      trackerPassword,
      selectorUsername,
      selectorPassword,
      selectorLoginButton,
      selectorTimeInButton,
      selectorTimeOutButton
    } = body

    if (!trackerUrl || !trackerUsername) {
      return NextResponse.json(
        { error: "URL and username are required" },
        { status: 400 }
      )
    }

    // Check if config exists
    const existingConfig = await prisma.timeTrackerConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    // Password is required only for new configs
    if (!existingConfig && !trackerPassword) {
      return NextResponse.json(
        { error: "Password is required for new configuration" },
        { status: 400 }
      )
    }

    // Prepare base data (without password)
    const baseData = {
      trackerUrl,
      trackerUsername,
      selectorUsername: selectorUsername || null,
      selectorPassword: selectorPassword || null,
      selectorLoginButton: selectorLoginButton || null,
      selectorTimeInButton: selectorTimeInButton || null,
      selectorTimeOutButton: selectorTimeOutButton || null,
    }

    // Upsert config (create or update)
    const config = await prisma.timeTrackerConfig.upsert({
      where: {
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
        ...baseData,
        trackerPasswordEncrypted: encrypt(trackerPassword!), // Required for create (we validated above)
      },
      update: trackerPassword
        ? {
            ...baseData,
            trackerPasswordEncrypted: encrypt(trackerPassword),
          }
        : baseData, // Only update password if provided
    })

    return NextResponse.json({
      config: {
        id: config.id,
        trackerUrl: config.trackerUrl,
        trackerUsername: config.trackerUsername,
        hasPassword: true,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    })
  } catch (error) {
    console.error("Config POST error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
