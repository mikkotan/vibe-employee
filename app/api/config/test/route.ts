import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { decrypt } from "@/lib/encryption"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"

// POST - Test connection to time tracker
export async function POST(request: Request) {
  let browser = null

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
      selectorLoginButton
    } = body

    if (!trackerUrl || !trackerUsername) {
      return NextResponse.json(
        { error: "URL and username are required" },
        { status: 400 }
      )
    }

    // If password not provided, try to use saved password
    let passwordToUse = trackerPassword
    let selectorsToUse = {
      username: selectorUsername,
      password: selectorPassword,
      loginButton: selectorLoginButton
    }

    if (!passwordToUse) {
      const config = await prisma.timeTrackerConfig.findUnique({
        where: { userId: session.user.id }
      })

      if (!config || !config.trackerPasswordEncrypted) {
        return NextResponse.json(
          { error: "Password is required (no saved password found)" },
          { status: 400 }
        )
      }

      passwordToUse = decrypt(config.trackerPasswordEncrypted)

      // Also load saved selectors if not provided in request
      if (!selectorsToUse.username) selectorsToUse.username = config.selectorUsername
      if (!selectorsToUse.password) selectorsToUse.password = config.selectorPassword
      if (!selectorsToUse.loginButton) selectorsToUse.loginButton = config.selectorLoginButton
    }

    // Launch browser in visible mode for testing
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 })

    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(30000)

    // Navigate to the tracker URL
    await page.goto(trackerUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // Attempt to login
    const loginResult = await attemptLogin(
      page,
      trackerUsername,
      passwordToUse,
      selectorsToUse.username,
      selectorsToUse.password,
      selectorsToUse.loginButton
    )

    // Take a screenshot for debugging
    const screenshot = await page.screenshot({ encoding: 'base64' })

    await browser.close()

    if (loginResult.success) {
      return NextResponse.json({
        success: true,
        message: loginResult.message || "Successfully logged in to the time tracker",
        screenshot: `data:image/png;base64,${screenshot}`,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: loginResult.error || "Failed to login",
        screenshot: `data:image/png;base64,${screenshot}`,
      }, { status: 400 })
    }
  } catch (error: any) {
    if (browser) {
      await browser.close()
    }

    console.error("Connection test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to connect to time tracker",
      },
      { status: 400 }
    )
  }
}

/**
 * Attempt to login to the time tracker
 * Uses custom selectors if provided, otherwise falls back to common patterns
 */
async function attemptLogin(
  page: any,
  username: string,
  password: string,
  selectorUsername?: string | null,
  selectorPassword?: string | null,
  selectorLoginButton?: string | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Determine username selector
    const usernameSelector = selectorUsername ||
      'input[type="text"], input[type="email"], input[name="username"], input[id="username"]'

    // Wait for username field
    await page.waitForSelector(usernameSelector, { timeout: 5000 })

    // Fill in username
    const usernameField = await page.$(usernameSelector)
    if (usernameField) {
      await usernameField.type(username)
    } else {
      return { success: false, error: "Username field not found" }
    }

    // Fill in password
    const passwordSelector = selectorPassword || 'input[type="password"]'
    const passwordField = await page.$(passwordSelector)
    if (passwordField) {
      await passwordField.type(password)
    } else {
      return { success: false, error: "Password field not found" }
    }

    // Click login button
    const loginButtonSelector = selectorLoginButton ||
      'button[type="submit"], input[type="submit"]'
    const loginButton = await page.$(loginButtonSelector)
    if (loginButton) {
      await loginButton.click()

      // Wait a bit for navigation or response
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      } catch (navError) {
        // Navigation might not happen for SPAs, continue anyway
        console.log("Navigation timeout, continuing...")
      }

      return { success: true, message: "Login attempted successfully" }
    } else {
      return { success: false, error: "Login button not found" }
    }
  } catch (error: any) {
    console.error("Login attempt error:", error)
    return { success: false, error: error.message || "Login attempt failed" }
  }
}
