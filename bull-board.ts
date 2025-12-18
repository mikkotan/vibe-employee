import "dotenv/config"
import express from "express"
import { createBullBoard } from "@bull-board/api"
import { BullAdapter } from "@bull-board/api/bullAdapter"
import { ExpressAdapter } from "@bull-board/express"
import { automationQueue } from "./lib/jobs/queue"

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath("/")

createBullBoard({
  queues: [new BullAdapter(automationQueue)],
  serverAdapter,
})

const app = express()

app.use("/", serverAdapter.getRouter())

const PORT = 3001

app.listen(PORT, () => {
  console.log("========================================")
  console.log(`Bull Board running at http://localhost:${PORT}`)
  console.log("========================================")
})
