"use client"

import { useSearchParams } from "next/navigation"

export default function TestRoute() {
  const searchParams = useSearchParams()
  const recordingUrl = searchParams.get("recording")
  const question = searchParams.get("question")

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Route Test Page</h1>
      <p>
        <strong>Recording URL:</strong> {recordingUrl || "Not provided"}
      </p>
      <p>
        <strong>Question:</strong> {question || "Not provided"}
      </p>
    </div>
  )
}
