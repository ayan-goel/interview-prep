"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Mic, Pause, Play, RefreshCw, Check, Camera, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { analyzeInterview, storeAnalysisResults } from "@/lib/api-service"

export default function MockInterviewPage() {
  // State for questions and progress
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [completedQuestions, setCompletedQuestions] = useState<{[key: string]: any}>({})
  const [results, setResults] = useState<any[]>([])

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingComplete, setRecordingComplete] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [maxRecordingTime] = useState(120) // 2 minutes max
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Permission state
  const [permissionStatus, setPermissionStatus] = useState<{ video: boolean; audio: boolean }>({
    video: false,
    audio: false,
  })

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Router and auth
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  // Load questions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQuestions = localStorage.getItem('mockInterviewQuestions')
      const storedIndex = localStorage.getItem('mockInterviewCurrentIndex')
      const storedResults = localStorage.getItem('mockInterviewResults')
      const storedCompleted = localStorage.getItem('mockInterviewCompleted')
      
      if (storedQuestions) {
        const parsedQuestions = JSON.parse(storedQuestions)
        setQuestions(parsedQuestions)
        
        if (storedIndex) {
          const parsedIndex = parseInt(storedIndex)
          setCurrentIndex(parsedIndex)
          setCurrentQuestion(parsedQuestions[parsedIndex])
        } else {
          setCurrentQuestion(parsedQuestions[0])
        }
      } else {
        // No questions found, redirect back to setup
        router.push('/practice/mock')
      }
      
      if (storedResults) {
        setResults(JSON.parse(storedResults))
      }
      
      if (storedCompleted) {
        setCompletedQuestions(JSON.parse(storedCompleted))
      }
    }
    
    // Cleanup when unmounting
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl)
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [router])

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/signin")
    }
  }, [user, router])

  // Check permissions on mount
  useEffect(() => {
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

  // Start camera automatically when permissions granted
  useEffect(() => {
    if (permissionStatus.video && permissionStatus.audio && !recordingUrl) {
      startCamera()
    }
  }, [permissionStatus, recordingUrl])

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true // Mute preview
        videoRef.current.play().catch(e => console.error("Error playing live preview:", e))
      }
      
      return stream
    } catch (err) {
      console.error("Error accessing camera/mic:", err)
      setSubmitError("Failed to access camera or microphone. Please check permissions.")
      return null
    }
  }

  const startRecording = async () => {
    // Reset state for a new recording
    setRecordedChunks([])
    setRecordingUrl(null)
    setRecordingTime(0)
    setRecordingComplete(false)
    setSubmitError(null)
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Stop any existing stream before getting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.play().catch(e => console.error("Error playing live preview:", e))
      }
      
      // Start countdown
      setCountdown(3)
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownInterval)
            beginRecording(stream)
            return null
          }
          return prev ? prev - 1 : null
        })
      }, 1000)
      
    } catch (error) {
      console.error("Error starting recording:", error)
      setSubmitError("Failed to start recording. Please check camera and microphone permissions.")
    }
  }
  
  const beginRecording = (stream: MediaStream) => {
    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' }
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Chunk received: ${e.data.size} bytes`)
          chunks.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        console.log(`Recording stopped. Total chunks: ${chunks.length}`)
        
        const blob = new Blob(chunks, { type: 'video/webm' })
        console.log(`Blob created, size: ${blob.size} bytes`)
        
        if (blob.size === 0) {
          console.error("Error: Empty video blob created")
          setSubmitError("Recording failed: No video data captured")
          return
        }
        
        const newUrl = URL.createObjectURL(blob)
        console.log(`Video URL created: ${newUrl}`)
        
        setRecordingUrl(newUrl)
        setRecordedChunks(chunks)
        setRecordingComplete(true)
        setIsRecording(false)
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        
        // Release the camera now that recording is done and URL is set
        if (streamRef.current) {
          console.log("Stopping tracks after recording")
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }
      
      // Reset timer state
      setRecordingTime(0)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Start the timer with a reliable approach
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
        setRecordingTime(elapsedSeconds)
        
        if (elapsedSeconds >= maxRecordingTime) {
          stopRecording()
        }
      }, 500)
      
      // Start recording with a more frequent data collection interval
      mediaRecorder.start(500) // 500ms chunks
      setIsRecording(true)
      console.log("Recording started")
      
    } catch (error: any) {
      console.error("Error setting up MediaRecorder:", error)
      setSubmitError(`Failed to setup recording: ${error.message || "Unknown error"}`)
    }
  }
  
  const stopRecording = () => {
    console.log("stopRecording called")
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping MediaRecorder")
      mediaRecorderRef.current.stop() // This will trigger onstop
    } else {
      console.log("MediaRecorder not in recording state:", 
                 mediaRecorderRef.current ? mediaRecorderRef.current.state : "no recorder")
    }
    // Timer and stream handled by onstop
  }
  
  const resetRecording = () => {
    console.log("resetRecording called")
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }
    
    setRecordingUrl(null)
    setRecordedChunks([])
    setRecordingComplete(false)
    setRecordingTime(0)
    setSubmitError(null)
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Restart camera
    startCamera()
  }

  const submitRecording = async () => {
    if (!recordedChunks.length) {
      console.error("No video chunks recorded")
      setSubmitError("Recording failed: No video data captured")
      return
    }
    
    console.log(`Recorded ${recordedChunks.length} video chunks, total size: ${
      recordedChunks.reduce((total, chunk) => total + chunk.size, 0) / 1024
    } KB`)
    
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      
      // Combine recorded chunks into a single blob
      const videoBlob = new Blob(recordedChunks, { type: 'video/webm' })
      
      console.log(`Video blob size: ${(videoBlob.size / 1024).toFixed(2)} KB`)
      
      // Create a proper file with filename to avoid the "blob" filename issue
      const videoFile = new File([videoBlob], "interview.webm", { type: "video/webm" })
      
      // Submit the recording directly to the backend API for analysis
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      console.log(`Sending to backend API: ${API_URL}/api/analyze`)
      
      // Create form data
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('question', currentQuestion)
      formData.append('user_id', user?.id || '')
      
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        // Try to get error details
        let errorDetails
        try {
          errorDetails = await response.json()
        } catch (e) {
          errorDetails = { message: response.statusText }
        }
        
        throw new Error(`Analysis failed: ${response.status} ${errorDetails.message || errorDetails.error || response.statusText}`)
      }
      
      const data = await response.json()
      
      // Store result and mark question as completed
      const newResults = [...results, data]
      setResults(newResults)
      localStorage.setItem('mockInterviewResults', JSON.stringify(newResults))
      
      const newCompleted = { ...completedQuestions, [currentQuestion]: data.results }
      setCompletedQuestions(newCompleted)
      localStorage.setItem('mockInterviewCompleted', JSON.stringify(newCompleted))
      
      // Show success message
      toast({
        title: "Answer Submitted Successfully",
        description: "Your answer has been analyzed and saved.",
        duration: 3000
      })
      
      // Move to next question or results page
      moveToNextQuestion()
      
    } catch (error) {
      console.error('Error submitting recording:', error)
      setSubmitError(error instanceof Error ? error.message : "Failed to submit recording")
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "There was a problem submitting your recording. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Move to next question or results page
  const moveToNextQuestion = () => {
    // Clean up recording resources
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }
    
    setRecordedChunks([])
    setRecordingUrl(null)
    setRecordingTime(0)
    setRecordingComplete(false)
    
    // Stop existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Stop existing stream to release camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (currentIndex < questions.length - 1) {
      // Move to next question
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setCurrentQuestion(questions[nextIndex])
      localStorage.setItem('mockInterviewCurrentIndex', nextIndex.toString())
      
      // Camera will be started automatically
    } else {
      // All questions completed, navigate to results page
      router.push('/practice/mock/results')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }
  
  // Calculate progress percentage
  const progressPercentage = questions.length ? 
    ((Object.keys(completedQuestions).length / questions.length) * 100) : 0
  
  if (!user || !currentQuestion) return null
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/practice/mock"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Exit Interview
          </Link>
          
          <Badge variant="outline" className="bg-white text-brand-700 border-brand-200 px-3 py-1 font-medium">
            Question {currentIndex + 1} of {questions.length}
          </Badge>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight gradient-text mb-3">Mock Interview</h1>
          <div className="flex items-center gap-2 mb-2">
            <Progress value={progressPercentage} className="h-2 flex-1" />
            <span className="text-sm text-brand-700 font-medium whitespace-nowrap">{Math.round(progressPercentage)}% Complete</span>
          </div>
        </div>
        
        <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-brand-800">Question {currentIndex + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-brand-900">{currentQuestion}</p>
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
              
              {recordingComplete && recordingUrl ? (
                <video
                  src={recordingUrl}
                  controls
                  className="h-full w-full"
                  onError={(e) => {
                    console.error("Video playback error:", e);
                    const videoElement = e.target as HTMLVideoElement;
                    console.log("Video element info:", {
                      src: videoElement.src,
                      readyState: videoElement.readyState,
                      error: videoElement.error ? videoElement.error.code : 'none'
                    });
                  }}
                  onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
                />
              ) : (
                <video
                  ref={videoRef}
                  className="h-full w-full transform scale-x-[-1]"
                  autoPlay
                  muted
                  playsInline
                />
              )}
              
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
                    onClick={submitRecording}
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
                        <Check className="mr-2 h-4 w-4" />
                        Submit Answer
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