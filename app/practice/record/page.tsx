"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Pause, Play, RefreshCw, Save, Mic, Camera } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { analyzeInterview, storeAnalysisResults } from "@/lib/api-service"

export default function RecordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const question = searchParams.get("question")
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingComplete, setRecordingComplete] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [maxRecordingTime] = useState(120) // 2 minutes max
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0) // Store the start timestamp
  const [permissionStatus, setPermissionStatus] = useState<{ video: boolean; audio: boolean }>({
    video: false,
    audio: false,
  })
  const { user } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [hasQuestion, setHasQuestion] = useState(!!question)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setShouldRedirect(true)
    }
  }, [user])

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/signin")
    }
  }, [shouldRedirect, router])

  useEffect(() => {
    if (!question) {
      router.push("/practice")
    }
  }, [question, router])

  useEffect(() => {
    // Check permissions on mount
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setPermissionStatus({ video: true, audio: true })

        // Stop the stream immediately after checking permissions
        stream.getTracks().forEach((track) => track.stop())
      } catch (err) {
        console.error("Error accessing camera or microphone:", err)
        // Try to determine which permission failed
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
          videoStream.getTracks().forEach((track) => track.stop())
          setPermissionStatus((prev) => ({ ...prev, video: true }))
        } catch (e) {
          setPermissionStatus((prev) => ({ ...prev, video: false }))
        }

        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          audioStream.getTracks().forEach((track) => track.stop())
          setPermissionStatus((prev) => ({ ...prev, audio: true }))
        } catch (e) {
          setPermissionStatus((prev) => ({ ...prev, audio: false }))
        }
      }
    }

    checkPermissions()
  }, [])

  useEffect(() => {
    // Clean up the object URL when component unmounts
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl)
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [recordingUrl])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      console.error("Error accessing camera:", err)
      return null
    }
  }

  const startRecording = async () => {
    // Start countdown
    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownInterval)
          initiateRecording()
          return null
        }
        return prev ? prev - 1 : null
      })
    }, 1000)
  }

  const initiateRecording = async () => {
    const stream = await startCamera()
    if (!stream) return

    setRecordedChunks([])
    setRecordingTime(0)
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data])
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" })
      const url = URL.createObjectURL(blob)
      setRecordingUrl(url)
      setRecordingComplete(true)

      // Stop all tracks of the stream
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    mediaRecorderRef.current = mediaRecorder
    mediaRecorder.start(1000) // Collect data every second
    setIsRecording(true)

    // Start timer with precise timing
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)
      
      setRecordingTime(elapsedSeconds)
      
      if (elapsedSeconds >= maxRecordingTime) {
        stopRecording()
      }
    }, 500) // Update more frequently for better precision
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const resetRecording = () => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }
    setRecordingUrl(null)
    setRecordedChunks([])
    setRecordingComplete(false)
    setRecordingTime(0)
  }

  const saveRecording = async () => {
    if (!recordedChunks.length) {
      console.error("No recording chunks available");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Combine recorded chunks into a single blob
      const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      
      // Call the API service
      console.log("Sending recording to backend for analysis...");
      const analysisResult = await analyzeInterview(videoBlob, question || "");
      console.log("Analysis complete:", analysisResult);
      
      // Store results in session storage
      storeAnalysisResults(analysisResult);
      
      // Navigate to the feedback page
      router.push('/practice/ai-feedback');
      
    } catch (error) {
      console.error("Error submitting interview:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to analyze interview");
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  if (shouldRedirect || !question) {
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
          <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">Record Your Answer</h1>
        </div>

        <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-brand-800">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-brand-900">{question}</p>
          </CardContent>
        </Card>

        {submitError && (
          <Card className="mb-6 bg-white/90 backdrop-blur-md border-red-200 shadow-lg">
            <CardContent className="pt-6">
              <p className="text-red-600 font-medium">Error: {submitError}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try again or refresh the page. If the problem persists, contact support.
              </p>
            </CardContent>
          </Card>
        )}

        {!permissionStatus.video || !permissionStatus.audio ? (
          <Card className="mb-6 bg-white/90 backdrop-blur-md border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Permission Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Camera className={`h-5 w-5 ${permissionStatus.video ? "text-green-500" : "text-red-500"}`} />
                  <span className={permissionStatus.video ? "text-green-700" : "text-red-700"}>
                    {permissionStatus.video ? "Camera access granted" : "Camera access required"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mic className={`h-5 w-5 ${permissionStatus.audio ? "text-green-500" : "text-red-500"}`} />
                  <span className={permissionStatus.audio ? "text-green-700" : "text-red-700"}>
                    {permissionStatus.audio ? "Microphone access granted" : "Microphone access required"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-4">
                  Please allow camera and microphone access to record your interview answer. You may need to refresh the
                  page after granting permissions.
                </p>
                <Button onClick={() => window.location.reload()} className="mt-4 bg-brand-600 hover:bg-brand-700">
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 aspect-video overflow-hidden rounded-xl bg-black shadow-xl relative">
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white z-10">
                  <span className="text-8xl font-bold">{countdown}</span>
                </div>
              )}
              <video
                ref={videoRef}
                className="h-full w-full transform scale-x-[-1]"
                autoPlay
                muted={!isRecording}
                playsInline
                src={recordingComplete ? recordingUrl || undefined : undefined}
              />

              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 text-white px-3 py-1 rounded-full">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            {isRecording && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>0:00</span>
                  <span>{formatTime(maxRecordingTime)}</span>
                </div>
                <Progress value={(recordingTime / maxRecordingTime) * 100} className="h-2" />
                <div className="mt-2 text-center text-sm font-medium text-brand-700">
                  {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 justify-center">
              {!isRecording && !recordingComplete && (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button size="lg" variant="destructive" onClick={stopRecording} className="shadow-lg hover:shadow-xl">
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}

              {recordingComplete && (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetRecording}
                    disabled={isSubmitting}
                    className="border-brand-200 text-brand-700 hover:bg-brand-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Record Again
                  </Button>

                  <Button
                    size="lg"
                    onClick={saveRecording}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full animate-spin"></div>
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Get AI Feedback
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
