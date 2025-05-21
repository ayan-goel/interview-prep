"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChevronLeft, Mic, Camera, Check, AlertTriangle, Play, Volume2, Volume, VolumeX } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function PrepareMockInterviewPage() {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [micPermission, setMicPermission] = useState<boolean | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  // Load questions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQuestions = localStorage.getItem('mockInterviewQuestions')
      
      if (storedQuestions) {
        const parsedQuestions = JSON.parse(storedQuestions)
        setInterviewQuestions(parsedQuestions)
      } else {
        // No questions found, redirect back to setup
        router.push('/practice/mock')
      }
    }
  }, [router])

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/signin")
    }
  }, [user, router])
  
  // Effect to handle video element once stream is ready
  useEffect(() => {
    if (videoStream && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.srcObject = videoStream;
      videoElement.muted = true; // Needed for autoplay in some browsers
      videoElement.play().catch(error => {
        console.error('Error playing video:', error);
        // Fallback for browsers that require user interaction for play
        const playOnInteraction = () => {
          videoElement.play().catch(e => console.error('Still cannot play video after interaction:', e));
          document.removeEventListener('click', playOnInteraction);
        };
        document.addEventListener('click', playOnInteraction);
      });
    }
  }, [videoStream]);
  
  // Start camera test
  const startCameraTest = async () => {
    try {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      // Request camera permission with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Make sure we update state after getting the stream
      setVideoStream(stream);
      setCameraPermission(true);
      
      // Explicit handling of video element
      // const videoElement = videoRef.current; // Moved to useEffect
      // if (videoElement) { // Moved to useEffect
      //   videoElement.srcObject = stream; // Moved to useEffect
      //   videoElement.muted = true; // Needed for some browsers // Moved to useEffect
        
      //   // Play immediately without waiting for a promise // Moved to useEffect
      //   videoElement.play().catch(error => { // Moved to useEffect
      //     console.error('Error playing video:', error); // Moved to useEffect
      //     // Try to play again on user interaction // Moved to useEffect
      //     document.addEventListener('click', () => { // Moved to useEffect
      //       videoElement.play().catch(e => console.error('Still cannot play video:', e)); // Moved to useEffect
      //     }, { once: true }); // Moved to useEffect
      //   }); // Moved to useEffect
      // } // Moved to useEffect
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraPermission(false);
    }
  };
  
  // Start microphone test
  const startMicTest = async () => {
    try {
      // Clean up previous microphone test resources
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null; // Always nullify before reassignment or if closed

      if (analyserRef.current) {
        // analyserRef.current.disconnect(); // Disconnecting might not be needed if context is closed
        analyserRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      audioStreamRef.current = stream; // Store the stream
      
      setMicPermission(true)
      
      // Create audio context for level visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256
      
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      // Start visualization loop
      const updateMeter = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Calculate audio level (0-100)
          const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength
          const level = Math.min(100, Math.round((average / 256) * 100))
          
          setAudioLevel(level)
        }
        
        animationFrameRef.current = requestAnimationFrame(updateMeter)
      }
      
      updateMeter()
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setMicPermission(false)
    }
  }
  
  // Clean up resources
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null;
      }
      
      if (analyserRef.current) {
        // analyserRef.current.disconnect(); // Analyser is part of the AudioContext; closing context handles it.
        analyserRef.current = null;
      }
    }
  }, []) // Empty dependency array ensures this runs only on unmount
  
  // Start the interview
  const startInterview = () => {
    // Stop media tracks immediately. Unmount cleanup will also run.
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop())
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Reset interview progress
    localStorage.setItem('mockInterviewCurrentIndex', '0')
    localStorage.removeItem('mockInterviewResults')
    localStorage.removeItem('mockInterviewCompleted')
    
    // Navigate to interview
    router.push('/practice/mock/interview')
  }
  
  // Get audio level icon
  const getAudioLevelIcon = () => {
    if (audioLevel === 0) return <VolumeX className="h-5 w-5" />
    if (audioLevel < 30) return <Volume className="h-5 w-5" />
    return <Volume2 className="h-5 w-5" />
  }
  
  if (!user) return null
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/practice/mock"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Setup
          </Link>
          <h1 className="mt-4 mb-2 text-3xl font-bold tracking-tight gradient-text">Prepare for Your Mock Interview</h1>
          <p className="text-muted-foreground max-w-xl">
            Test your equipment and review tips before starting your {interviewQuestions.length}-question mock interview.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-brand-700" />
                </div>
                Camera and Microphone Test
              </CardTitle>
              <CardDescription>
                Ensure your equipment is working properly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-brand-800">Camera</h3>
                <div>
                  <Button onClick={startCameraTest} className="w-full mb-3">
                    Test Camera
                  </Button>
                  
                  {cameraPermission === true && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    </div>
                  )}
                  
                  {cameraPermission === false && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-red-800 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="font-medium">Camera access denied</span>
                      </div>
                      <p className="text-sm">Please enable camera access in your browser settings and refresh this page.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium text-brand-800">Microphone</h3>
                {micPermission === null ? (
                  <Button onClick={startMicTest} className="w-full">
                    Test Microphone
                  </Button>
                ) : micPermission ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-50 border border-brand-100 p-2 rounded-full">
                        {getAudioLevelIcon()}
                      </div>
                      <div className="flex-1">
                        <Progress value={audioLevel} className="h-3" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Speak into your microphone to test the audio level. Make sure the bar moves when you talk.
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-red-800">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Microphone access denied</span>
                    </div>
                    <p className="text-sm">Please enable microphone access in your browser settings and refresh this page.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-brand-700">
                    <path d="m16 6 4 14"></path>
                    <path d="M12 6v14"></path>
                    <path d="M8 8v12"></path>
                    <path d="M4 4v16"></path>
                  </svg>
                </div>
                Interview Tips & Best Practices
              </CardTitle>
              <CardDescription>
                Key strategies for a successful interview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="flex gap-3 items-start mb-2">
                    <div className="h-6 w-6 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="font-medium text-green-800">Use the STAR Method</h3>
                  </div>
                  <p className="text-sm text-green-700 ml-9">
                    Structure your answers with <b>S</b>ituation, <b>T</b>ask, <b>A</b>ction, and <b>R</b>esult to provide clear and comprehensive responses.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex gap-3 items-start mb-2">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-blue-800">Give Specific Examples</h3>
                  </div>
                  <p className="text-sm text-blue-700 ml-9">
                    Use concrete examples from your experience to illustrate your skills and achievements, rather than generic statements.
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <div className="flex gap-3 items-start mb-2">
                    <div className="h-6 w-6 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Check className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-purple-800">Mind Your Body Language</h3>
                  </div>
                  <p className="text-sm text-purple-700 ml-9">
                    Maintain good posture, make eye contact with the camera, and use appropriate hand gestures to appear confident and engaged.
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="flex gap-3 items-start mb-2">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="font-medium text-amber-800">Avoid Rushing</h3>
                  </div>
                  <p className="text-sm text-amber-700 ml-9">
                    Take a moment to gather your thoughts before answering. Speaking slowly and clearly shows confidence and helps interviewers follow your response.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-10">
          <Button 
            onClick={startInterview}
            size="lg" 
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl py-6 text-lg"
          >
            <Play className="mr-3 h-5 w-5" />
            Start Mock Interview
          </Button>
        </div>
      </div>
    </div>
  )
} 