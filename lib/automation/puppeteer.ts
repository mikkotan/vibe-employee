import puppeteer, { Browser, Page } from "puppeteer"
import { decrypt } from "@/lib/encryption"
import { prisma } from "@/lib/prisma"

export type AutomationAction = "TIME_IN" | "TIME_OUT"

export interface AutomationResult {
  success: boolean
  action: AutomationAction
  scheduledTime: Date
  actualTime: Date
  errorMessage?: string
  screenshot?: string
}

/**
 * Main automation function that logs in and performs time-in or time-out action
 * @param userId - The user ID
 * @param action - Whether to clock in or out
 * @param scheduledTime - When this action was scheduled to run
 * @param timeLogId - The ID of the TimeLog entry to update
 * @returns AutomationResult with success status and details
 */
export async function performAutomation(
  userId: string,
  action: AutomationAction,
  scheduledTime: Date,
  timeLogId: string
): Promise<AutomationResult> {
  let browser: Browser | null = null
  const actualTime = new Date()

  try {
    // Fetch user's time tracker config
    const config = await prisma.timeTrackerConfig.findUnique({
      where: { userId },
    })

    if (!config) {
      throw new Error("Time tracker configuration not found")
    }

    // Decrypt password (in-memory only, never logged)
    const password = decrypt(config.trackerPasswordEncrypted)

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    })

    const page = await browser.newPage()

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 })

    // Navigate to time tracker
    await page.goto(config.trackerUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // TODO: This is a generic implementation
    // In a real-world scenario, you'd need to customize this based on
    // the specific time tracker website structure

    // Example: Try to find login form elements
    // You would need to adjust selectors based on the actual website
    const loginSuccess = await attemptLogin(
      page,
      config.trackerUsername,
      password,
      config.selectorUsername,
      config.selectorPassword,
      config.selectorLoginButton
    )

    if (!loginSuccess) {
      throw new Error("Failed to login to time tracker")
    }

    // Perform the time-in or time-out action
    const actionSelector = action === "TIME_IN"
      ? config.selectorTimeInButton
      : config.selectorTimeOutButton
    await performAction(page, action, actionSelector)

    // Take screenshot for verification
    const screenshot = await page.screenshot({ encoding: 'base64' })

    // Clear password from memory
    password.replace(/./g, '0')

    await browser.close()

    // Update the TimeLog entry to SUCCESS
    await prisma.timeLog.update({
      where: { id: timeLogId },
      data: {
        actualTime,
        status: "SUCCESS",
      },
    })

    return {
      success: true,
      action,
      scheduledTime,
      actualTime,
      screenshot: `data:image/png;base64,${screenshot}`,
    }
  } catch (error: any) {
    console.error("Automation error:", error)

    if (browser) {
      await browser.close()
    }

    // Update the TimeLog entry to FAILED
    await prisma.timeLog.update({
      where: { id: timeLogId },
      data: {
        actualTime,
        status: "FAILED",
        errorMessage: error.message,
      },
    })

    return {
      success: false,
      action,
      scheduledTime,
      actualTime,
      errorMessage: error.message,
    }
  }
}

/**
 * Attempt to login to the time tracker
 * Uses custom selectors if provided, otherwise falls back to common patterns
 */
async function attemptLogin(
  page: Page,
  username: string,
  password: string,
  selectorUsername?: string | null,
  selectorPassword?: string | null,
  selectorLoginButton?: string | null
): Promise<boolean> {
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
      throw new Error("Username field not found")
    }

    // Fill in password
    const passwordSelector = selectorPassword || 'input[type="password"]'
    const passwordField = await page.$(passwordSelector)
    if (passwordField) {
      await passwordField.type(password)
    } else {
      throw new Error("Password field not found")
    }

    // Click login button
    const loginButtonSelector = selectorLoginButton ||
      'button[type="submit"], input[type="submit"]'
    const loginButton = await page.$(loginButtonSelector)
    if (loginButton) {
      await loginButton.click()
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
    } else {
      throw new Error("Login button not found")
    }

    return true
  } catch (error) {
    console.error("Login attempt error:", error)
    return false
  }
}

/**
 * Perform the time-in or time-out action
 * Uses custom selector if provided, otherwise searches for common button text
 */
async function performAction(
  page: Page,
  action: AutomationAction,
  customSelector?: string | null
): Promise<void> {
  try {
    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 2000))

    let actionButton = null

    if (customSelector) {
      // Use custom selector if provided
      actionButton = await page.$(customSelector)
    } else {
      // Fall back to searching by text
      const buttonText = action === "TIME_IN" ? "Clock In" : "Clock Out"
      actionButton = await page.$(
        `button:has-text("${buttonText}"), a:has-text("${buttonText}"), input[value="${buttonText}"]`
      )
    }

    if (actionButton) {
      await actionButton.click()
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      // If specific button not found, take screenshot anyway
      console.warn(`Action button for ${action} not found`)
      throw new Error(`Action button for ${action} not found. Please configure the selector in settings.`)
    }
  } catch (error) {
    console.error("Action performance error:", error)
    throw error
  }
}
