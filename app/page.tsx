import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          LockLock
        </h1>
        <p className="mb-2 text-xl text-gray-600">
          Lock in your time, automatically
        </p>
        <p className="mb-8 text-lg text-gray-500">
          Automated time tracking made simple. Never forget to clock in or out again.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
