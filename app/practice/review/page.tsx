"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Download, RefreshCw, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"

export default function ReviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const recordingUrl = searchParams.get("recording")
  const question = searchParams.get("question")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [notes, setNotes] = useState({
    strengths: "",
    improvements: "",
    keyTakeaways: "",
  })
  const { user, loading } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsAuthenticated(!!user)
    }
  }, [user, loading])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (!recordingUrl || !question) {
      router.push("/practice")
    }
  }, [recordingUrl, question, router])

  const downloadRecording = () => {
    if (recordingUrl) {
      const a = document.createElement("a")
      document.body.appendChild(a)
      a.style.display = "none"
      a.href = recordingUrl
      a.download = `interview-answer-${Date.now()}.webm`
      a.click()
      document.body.removeChild(a)
    }
  }

  const tryAgain = () => {
    if (question) {
      router.push(`/practice/record?question=${encodeURIComponent(question)}`)
    } else {
      router.push("/practice")
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/practice"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Questions
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">Review Your Answer</h1>
          <p className="mt-2 text-muted-foreground">Watch your recording and evaluate your performance.</p>
        </div>

        <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-brand-800">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-brand-900">{question}</p>
          </CardContent>
        </Card>

        <div className="mb-6 aspect-video overflow-hidden rounded-xl bg-black shadow-xl">
          <video ref={videoRef} className="h-full w-full" controls src={recordingUrl || undefined} />
        </div>

        <Tabs defaultValue="self-evaluation" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="self-evaluation" className="text-brand-700">
              Self-Evaluation
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-brand-700">
              Interview Tips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="self-evaluation" className="animate-in">
            <div className="space-y-6">
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                    <CardTitle className="text-lg text-brand-800">What went well?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[100px] border-brand-200 focus-visible:ring-brand-500"
                    placeholder="Note the strengths of your answer..."
                    value={notes.strengths}
                    onChange={(e) => setNotes({ ...notes, strengths: e.target.value })}
                  />
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <ThumbsDown className="h-5 w-5 text-amber-500 mr-2" />
                    <CardTitle className="text-lg text-brand-800">What could be improved?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[100px] border-brand-200 focus-visible:ring-brand-500"
                    placeholder="Note areas for improvement..."
                    value={notes.improvements}
                    onChange={(e) => setNotes({ ...notes, improvements: e.target.value })}
                  />
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-accent1 mr-2" />
                    <CardTitle className="text-lg text-brand-800">Key takeaways</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[100px] border-brand-200 focus-visible:ring-brand-500"
                    placeholder="What are your main takeaways from this practice session?"
                    value={notes.keyTakeaways}
                    onChange={(e) => setNotes({ ...notes, keyTakeaways: e.target.value })}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="animate-in">
            <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-brand-800">Interview Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
                  <h3 className="font-medium text-brand-800 mb-2">Body Language</h3>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li>Maintain good posture and sit up straight</li>
                    <li>Make appropriate eye contact with the interviewer</li>
                    <li>Use hand gestures naturally but not excessively</li>
                    <li>Avoid fidgeting or nervous movements</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
                  <h3 className="font-medium text-brand-800 mb-2">Voice and Delivery</h3>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li>Speak clearly and at a moderate pace</li>
                    <li>Vary your tone to emphasize important points</li>
                    <li>Avoid filler words like "um," "like," and "you know"</li>
                    <li>Pause briefly before answering complex questions</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
                  <h3 className="font-medium text-brand-800 mb-2">Content Structure</h3>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li>Use the STAR method for behavioral questions (Situation, Task, Action, Result)</li>
                    <li>Keep answers concise and relevant (1-2 minutes per question)</li>
                    <li>Include specific examples rather than general statements</li>
                    <li>End with a positive conclusion or lesson learned</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={downloadRecording}
            className="border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Recording
          </Button>

          <Button
            size="lg"
            onClick={tryAgain}
            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Another Question
          </Button>
        </div>
      </div>
    </div>
  )
}
