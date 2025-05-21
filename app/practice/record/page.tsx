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
  const streamRef = useRef<MediaStream | null>(null)
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
      
      // Clean up media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [recordingUrl])

  // Start camera automatically when component loads
  useEffect(() => {
    if (permissionStatus.video && permissionStatus.audio) {
      startCamera();
    }
  }, [permissionStatus]);

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true // Include audio to match mock interview approach
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview
        videoRef.current.play().catch(e => console.error("Error playing live preview:", e));
      }
      
      return stream;
    } catch (err) {
      console.error("Error accessing camera/mic:", err);
      setSubmitError("Failed to access camera or microphone. Please check permissions.");
      return null;
    }
  }

  const startRecording = async () => {
    // Reset state for a new recording
    setRecordedChunks([]);
    setRecordingUrl(null);
    setRecordingTime(0);
    setRecordingComplete(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop any existing stream before getting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(e => console.error("Error playing live preview:", e));
      }
      
      // Start countdown
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownInterval);
            beginRecording(stream);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setSubmitError("Failed to start recording. Please check camera and microphone permissions.");
    }
  }
  
  const beginRecording = (stream: MediaStream) => {
    try {
      // Try with the same options as the mock interview page
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Chunk received: ${e.data.size} bytes`);
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log(`Recording stopped. Total chunks: ${chunks.length}`);
        
        // Create blob and URL exactly like the mock interview page
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log(`Blob created, size: ${blob.size} bytes`);
        
        if (blob.size === 0) {
          console.error("Error: Empty video blob created");
          setSubmitError("Recording failed: No video data captured");
          return;
        }
        
        const newUrl = URL.createObjectURL(blob);
        console.log(`Video URL created: ${newUrl}`);
        
        setRecordingUrl(newUrl);
        setRecordedChunks(chunks);
        setRecordingComplete(true);
        setIsRecording(false);
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Release the camera now that recording is done and URL is set
        if (streamRef.current) {
          console.log("Stopping tracks after recording");
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
      
      // Reset timer state
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Start the timer with the same reliable approach
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsedSeconds);
        
        if (elapsedSeconds >= maxRecordingTime) {
          stopRecording();
        }
      }, 500);
      
      // Start recording with a more frequent data collection interval
      mediaRecorder.start(500); // 500ms chunks
      setIsRecording(true);
      console.log("Recording started");
      
    } catch (error: any) {
      console.error("Error setting up MediaRecorder:", error);
      setSubmitError(`Failed to setup recording: ${error.message || "Unknown error"}`);
    }
  }
  
  const stopRecording = () => {
    console.log("stopRecording called");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping MediaRecorder");
      mediaRecorderRef.current.stop(); // This will trigger onstop
    } else {
      console.log("MediaRecorder not in recording state:", 
                 mediaRecorderRef.current ? mediaRecorderRef.current.state : "no recorder");
    }
    // Timer and stream handled by onstop
  }
  
  const resetRecording = () => {
    console.log("resetRecording called");
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }
    
    setRecordingUrl(null);
    setRecordedChunks([]);
    setRecordingComplete(false);
    setRecordingTime(0);
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Restart camera
    startCamera();
  }

  const saveRecording = async () => {
    if (!recordedChunks.length) {
      console.error("No video chunks recorded");
      setSubmitError("Recording failed: No video data captured");
      return;
    }
    
    console.log(`Recorded ${recordedChunks.length} video chunks, total size: ${
      recordedChunks.reduce((total, chunk) => total + chunk.size, 0) / 1024
    } KB`);
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Combine recorded chunks into a single blob
      const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      
      console.log(`Video blob size: ${(videoBlob.size / 1024).toFixed(2)} KB`);
      
      // Store the blob and question in session storage for processing on the feedback page
      const videoUrl = URL.createObjectURL(videoBlob);
      
      sessionStorage.setItem('pendingVideoBlob', videoUrl);
      sessionStorage.setItem('pendingQuestion', question || "");
      
      // Navigate to the feedback page immediately
      router.push('/practice/ai-feedback');
      
    } catch (error) {
      console.error("Error preparing interview:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to prepare interview data");
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
              
              {recordingComplete && recordingUrl ? (
                <video
                  src={recordingUrl}
                  controls
                  autoPlay
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
