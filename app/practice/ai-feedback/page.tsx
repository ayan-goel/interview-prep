"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChevronLeft, Home, ListChecks, Sparkles, ThumbsUp, ThumbsDown, Clock, Volume2, Monitor, Eye, Activity, AlertCircle, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { analyzeInterview, getAnalysisResults, storeAnalysisResults, savePracticeResults } from "@/lib/api-service"

interface AnalysisResults {
  analysis_id: string;
  results: {
    question: string;
    transcript: string;
    raw_transcript?: string;
    scores: {
      content: number;
      structure: number;
      delivery: number;
      confidence: number;
      overall: number;
    };
    strengths: Array<{
      category: string;
      description: string;
      example?: string;
      impact?: string;
    }>;
    improvements: Array<{
      category: string;
      description: string;
      example?: string;
      advice: string;
      improved_example?: string;
    }>;
    speech_metrics: {
      speaking_rate: number;
      vocabulary_diversity: number;
      vocabulary_analysis?: string;
      answer_completeness: string;
      completeness_details?: string;
      pace_analysis?: string;
      filler_words: {
        total: number;
        details: Record<string, number>;
      };
    };
    body_language: {
      posture: {
        score: number;
        evaluation: string;
      };
      eye_contact: {
        score: number;
        evaluation: string;
        details?: string;
      };
      movement: {
        score: number;
        evaluation: string;
        details?: {
          movement_level: string;
          avg_magnitude: number;
          variance: number;
        };
      };
    };
    key_takeaways?: Array<{
      priority: number;
      recommendation: string;
      expected_impact: string;
    }>;
  };
}

// Spinning loader component
const LoadingSpinner = ({ progress }: { progress: number }) => (
  <div className="relative flex items-center justify-center">
    <div className="absolute text-center">
      <span className="text-lg font-semibold text-brand-900">{progress}%</span>
    </div>
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      {/* Background circle */}
      <circle 
        className="text-brand-100" 
        strokeWidth="8" 
        stroke="currentColor" 
        fill="transparent" 
        r="42" 
        cx="50" 
        cy="50"
      />
      {/* Progress circle */}
      <circle
        className="text-brand-600" 
        strokeWidth="8" 
        strokeDasharray={264}
        strokeDashoffset={264 - (264 * progress) / 100}
        strokeLinecap="round" 
        stroke="currentColor" 
        fill="transparent" 
        r="42" 
        cx="50" 
        cy="50"
        style={{ 
          transition: "stroke-dashoffset 0.8s ease 0s",
          transformOrigin: "center",
          transform: "rotate(-90deg)"
        }}
      />
    </svg>
  </div>
);

export default function AIFeedbackPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)  
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const processingStartedRef = useRef(false)
  const hasAttemptedSaveRef = useRef(false)

  // Redirect if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      // Wait a moment to ensure auth state is properly loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!user) {
        router.push("/signin")
      }
      setIsLoading(false)
    }
    
    checkAuth()
  }, [user, router])

  // Process pending video or load existing results
  useEffect(() => {
    if (!isLoading && !processingStartedRef.current) {
      processingStartedRef.current = true;
      
      const processVideoOrLoadResults = async () => {
        try {
          // Check if there's a pending video to process
          const pendingVideoURL = typeof window !== 'undefined' ? sessionStorage.getItem('pendingVideoBlob') : null;
          const pendingAudioURL = typeof window !== 'undefined' ? sessionStorage.getItem('pendingAudioBlob') : null;
          const pendingQuestion = typeof window !== 'undefined' ? sessionStorage.getItem('pendingQuestion') : null;
          const useSeparateAudio = typeof window !== 'undefined' ? sessionStorage.getItem('useSeparateAudio') === 'true' : false;
          
          if (pendingVideoURL && pendingQuestion) {
            console.log("Found pending video to analyze");
            
            // Start progress animation (slower progress increment)
            const progressInterval = setInterval(() => {
              setAnalysisProgress((prev) => {
                // Cap at 95% while waiting for actual analysis to complete
                return prev < 95 ? prev + 1 : prev;
              });
            }, 300);
            
            try {
              // Handle analysis with either separate audio or extracted from video
              let analysisResult;
              
              if (useSeparateAudio && pendingAudioURL) {
                console.log("Using separate high-quality audio recording");
                
                try {
                  // Fetch the audio blob
                  const audioResponse = await fetch(pendingAudioURL);
                  if (!audioResponse.ok) {
                    throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
                  }
                  const audioBlob = await audioResponse.blob();
                  console.log(`Audio blob size: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB`);
                  
                  // Fetch the video blob (for visual analysis)
                  const videoResponse = await fetch(pendingVideoURL);
                  if (!videoResponse.ok) {
                    throw new Error(`Failed to fetch video: ${videoResponse.status}`);
                  }
                  const videoBlob = await videoResponse.blob();
                  console.log(`Video blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);
                  
                  if (audioBlob.size === 0) {
                    throw new Error("Audio recording is empty");
                  }
                  
                  if (videoBlob.size === 0) {
                    throw new Error("Video recording is empty");
                  }
                  
                  // Send to backend for analysis with separate audio file
                  console.log("Sending recording to backend for analysis with separate audio...");
                  analysisResult = await analyzeInterview(videoBlob, pendingQuestion, audioBlob);
                } catch (fetchError: any) {
                  console.error("Error processing media:", fetchError);
                  throw new Error(`Failed to process recorded media: ${fetchError.message || 'Unknown error'}`);
                }
              } else {
                // Fetch the video blob for traditional processing
                const response = await fetch(pendingVideoURL);
                const videoBlob = await response.blob();
                
                // Send to backend for analysis (will extract audio from video)
                console.log("Sending recording to backend for analysis (extracting audio from video)...");
                analysisResult = await analyzeInterview(videoBlob, pendingQuestion);
              }
              
              console.log("Analysis complete:", analysisResult);
              
              // Store and set results
              storeAnalysisResults(analysisResult);
              setAnalysisResults(analysisResult);
              
              // Clean up
              URL.revokeObjectURL(pendingVideoURL);
              if (pendingAudioURL) URL.revokeObjectURL(pendingAudioURL);
              sessionStorage.removeItem('pendingVideoBlob');
              sessionStorage.removeItem('pendingAudioBlob');
              sessionStorage.removeItem('pendingQuestion');
              sessionStorage.removeItem('useSeparateAudio');
              
              // Complete progress
              clearInterval(progressInterval);
              setAnalysisProgress(100);
              setTimeout(() => setIsAnalyzing(false), 500);
              
            } catch (analyzeError) {
              clearInterval(progressInterval);
              console.error("Error analyzing interview:", analyzeError);
              setError(analyzeError instanceof Error ? analyzeError.message : "Failed to analyze interview");
              setIsAnalyzing(false);
            }
          } else {
            // Try to load existing results
            const results = getAnalysisResults();
            
            if (!results) {
              console.log("No analysis data found, redirecting to practice page");
              setError("Analysis data not found. Please record a new interview.");
              setIsAnalyzing(false);
              return;
            }
            
            console.log("Loaded existing analysis results");
            setAnalysisResults(results);
            
            // Simulate progress just for UX completeness (slower)
            const simulatedInterval = setInterval(() => {
              setAnalysisProgress((prev) => {
                const newProgress = prev + 1;
                if (newProgress >= 100) {
                  clearInterval(simulatedInterval);
                  setIsAnalyzing(false);
                  return 100;
                }
                return newProgress;
              });
            }, 150);
            
            return () => clearInterval(simulatedInterval);
          }
        } catch (error) {
          console.error("Error in processing:", error);
          setError("Failed to process interview. Please try again.");
          setIsAnalyzing(false);
        }
      };
      
      processVideoOrLoadResults();
    }
  }, [isLoading, router]);

  // Save results to the database
  useEffect(() => {
    const saveResultsToDatabase = async () => {
      // Only proceed if we have results, a user, and haven't already saved or attempted to save
      if (analysisResults && user && !isAnalyzing && !isSaved && !hasAttemptedSaveRef.current) {
        try {
          hasAttemptedSaveRef.current = true;
          setIsSaving(true);
          setSaveError(null);
          
          console.log("Saving practice results to database...");
          await savePracticeResults(user.id, analysisResults);
          
          setIsSaved(true);
          console.log("Practice results saved successfully");
        } catch (error) {
          console.error("Error saving practice results:", error);
          setSaveError(error instanceof Error ? error.message : "Failed to save results");
        } finally {
          setIsSaving(false);
        }
      }
    };
    
    saveResultsToDatabase();
  }, [analysisResults, user, isAnalyzing, isSaved]);

  // Show the analyzing state with progress bar
  if (isAnalyzing) {
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
            <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">Processing Your Interview</h1>
          </div>
          
          <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-brand-800">Analysis in Progress</CardTitle>
              <CardDescription>
                Please wait while our AI analyzes your interview performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center mb-8">
                <LoadingSpinner progress={analysisProgress} />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                We're evaluating your delivery, content, and structure to provide personalized feedback.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Early return if not authenticated
  if (!user) {
    return null;
  }

  // Show error message if needed
  if (error) {
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
            <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">AI Feedback</h1>
          </div>
          
          <Card className="mb-6 bg-white/90 backdrop-blur-md border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                onClick={() => router.push("/practice")}
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const results = analysisResults?.results;
  const question = results?.question;
  const scores = results?.scores;
  const strengths = results?.strengths || [];
  const improvements = results?.improvements || [];
  const speechMetrics = results?.speech_metrics;
  const bodyLanguage = results?.body_language;

  const getEmptyTranscriptMessage = (transcript: string) => {
    // Check if transcript contains specific error messages
    if (transcript.includes("microphone is working") || 
        transcript.includes("No speech detected")) {
      return (
        <div className="p-4 mt-4 border-l-4 border-orange-500 bg-orange-50 text-orange-700">
          <h4 className="text-lg font-semibold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Microphone Issue Detected
          </h4>
          <p className="mt-2">
            We couldn't detect any speech in your recording. Please check that:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>Your microphone is not muted</li>
            <li>You're speaking loud enough for the microphone to hear you</li>
            <li>The correct microphone is selected in your browser</li>
            <li>You have granted microphone permissions to this site</li>
          </ul>
          <p className="mt-2">
            Try recording again after checking these settings.
          </p>
        </div>
      );
    }
    
    // Generic message for other transcription issues
    if (transcript.includes("try again with a clearer recording")) {
      return (
        <div className="p-4 mt-4 border-l-4 border-amber-500 bg-amber-50 text-amber-700">
          <h4 className="text-lg font-semibold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Speech Recognition Issue
          </h4>
          <p className="mt-2">
            Speech was detected, but our system had trouble converting it to text.
            This could be due to background noise, unclear speech, or technical issues.
          </p>
          <p className="mt-2">
            Try recording again in a quieter environment and speaking clearly.
          </p>
        </div>
      );
    }
    
    return null;
  };

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
          <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">AI Feedback</h1>
          <p className="mt-2 text-muted-foreground">AI-powered analysis and feedback on your interview performance.</p>
        </div>

        <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-brand-800">Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium text-brand-900">{question}</p>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl text-brand-800">Performance Score</CardTitle>
              <CardDescription>Overall assessment of your interview answer</CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <LoadingSpinner progress={analysisProgress} />
                  </div>
                  <p className="text-center text-muted-foreground">Analyzing your response...</p>
                </div>
              ) : (
              <div className="grid sm:grid-cols-5 gap-4">
                <div className="col-span-2 sm:col-span-2 flex justify-center items-center">
                    <div className="relative">
                      <svg className="w-32 h-32">
                        <circle
                          className="text-muted stroke-current"
                          strokeWidth="8"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="64"
                          cy="64"
                        />
                        <circle
                          className="text-brand-500 stroke-current"
                          strokeWidth="8"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="56"
                          cx="64"
                          cy="64"
                          strokeDasharray="352.56"
                        strokeDashoffset={352.56 - (352.56 * (scores?.overall || 0) / 100)}
                        />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-brand-800">
                      {Math.round(scores?.overall || 0)}
                    </div>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Content</p>
                      <p className="text-lg font-medium text-brand-800">{scores?.content || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Delivery</p>
                      <p className="text-lg font-medium text-brand-800">{scores?.delivery || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Structure</p>
                      <p className="text-lg font-medium text-brand-800">{scores?.structure || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-medium text-brand-800">{scores?.confidence || 0}/100</p>
                    </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {!isAnalyzing && (
          <>
          <Tabs defaultValue="feedback" className="mb-8">
              <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="feedback" className="text-brand-700">
                Detailed Feedback
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-brand-700">
                Speech Metrics
              </TabsTrigger>
                <TabsTrigger value="body-language" className="text-brand-700">
                  Body Language
                </TabsTrigger>
              <TabsTrigger value="transcript" className="text-brand-700">
                Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="animate-in">
              <div className="space-y-6">
                {analysisResults?.results?.key_takeaways && (
                  <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
                        <CardTitle className="text-lg text-brand-800">Key Takeaways</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        {analysisResults.results.key_takeaways.sort((a, b) => a.priority - b.priority).map((takeaway, index) => (
                          <li key={index} className="pb-3 last:pb-0 border-b last:border-b-0 border-gray-100">
                            <div className="flex gap-2">
                              <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium">
                                {takeaway.priority}
                              </div>
                              <div className="flex-1">
                                <p className="text-brand-800 font-medium">{takeaway.recommendation}</p>
                                <p className="text-sm text-muted-foreground mt-1">{takeaway.expected_impact}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                      <CardTitle className="text-lg text-brand-800">Strengths</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {strengths.map((strength, index) => (
                        <div key={index} className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-brand-800 mb-2">{strength.category}</h3>
                          <p className="text-brand-700">{strength.description}</p>
                          
                          {strength.example && (
                            <div className="mt-3 bg-white rounded-md border border-green-100 p-3">
                              <div className="text-sm text-brand-600 font-medium mb-1">Example:</div>
                              <div className="text-sm text-brand-700 italic">"{strength.example}"</div>
                            </div>
                          )}
                          
                          {strength.impact && (
                            <div className="mt-3 flex items-start">
                              <div className="bg-green-100 p-1 rounded mr-2 mt-0.5">
                                <TrendingUp className="h-3 w-3 text-green-700" />
                              </div>
                              <div className="text-sm text-brand-600">{strength.impact}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <ThumbsDown className="h-5 w-5 text-amber-500 mr-2" />
                      <CardTitle className="text-lg text-brand-800">Areas for Improvement</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {improvements.map((improvement, index) => (
                        <div key={index} className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-brand-800 mb-2">{improvement.category}</h3>
                          <p className="text-brand-700">{improvement.description}</p>
                          
                          {improvement.example && (
                            <div className="mt-3 bg-white rounded-md border border-amber-100 p-3">
                              <div className="text-sm text-brand-600 font-medium mb-1">From your answer:</div>
                              <div className="text-sm text-brand-700 italic">"{improvement.example}"</div>
                            </div>
                          )}
                          
                          <div className="mt-3 bg-white rounded-md border border-brand-100 p-3">
                            <div className="text-sm text-brand-600 font-medium mb-1">Advice:</div>
                            <div className="text-sm text-brand-700">{improvement.advice}</div>
                          </div>
                          
                          {improvement.improved_example && (
                            <div className="mt-3 bg-green-50 rounded-md border border-green-100 p-3">
                              <div className="text-sm text-green-700 font-medium mb-1">Better approach:</div>
                              <div className="text-sm text-green-600">{improvement.improved_example}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="animate-in">
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-brand-700">Speaking Rate</span>
                          <Badge variant="outline" className="text-brand-700">
                            {speechMetrics?.speaking_rate || 0} words/min
                          </Badge>
                        </div>
                        <Progress 
                          value={Math.min(100, (speechMetrics?.speaking_rate || 0) / 2)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {speechMetrics?.pace_analysis || 
                            (speechMetrics?.speaking_rate && speechMetrics.speaking_rate > 160 
                              ? "Your pace is slightly fast. Try to slow down a bit." 
                              : speechMetrics?.speaking_rate && speechMetrics.speaking_rate < 120
                              ? "Your pace is slightly slow. Try to speak a bit faster."
                              : "Your speaking pace is good for interview settings.")}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="text-sm font-medium text-brand-700 mb-3">Filler Words</div>
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total filler words used:</span>
                            <Badge variant={speechMetrics?.filler_words?.total === 0 ? "success" : 
                                         speechMetrics?.filler_words?.total && speechMetrics?.filler_words?.total < 5 ? "outline" : "destructive"}>
                              {speechMetrics?.filler_words?.total || 0}
                            </Badge>
                          </div>
                          {speechMetrics?.filler_words?.total && speechMetrics?.filler_words?.total > 0 ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {Object.entries(speechMetrics?.filler_words?.details || {}).map(([word, count]) => (
                                  <div key={word} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                    <span className="text-sm font-mono">"{word}"</span>
                                    <Badge variant="secondary">{count as number}×</Badge>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-amber-600 mt-2">
                                Reducing filler words can make your responses sound more confident and articulate.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-green-600">
                              Excellent! You used minimal or no filler words in your response.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-brand-700">Vocabulary Diversity</span>
                            <Badge variant="outline" className="text-brand-700">
                              {speechMetrics?.vocabulary_diversity || 0}/100
                            </Badge>
                          </div>
                          <Progress value={speechMetrics?.vocabulary_diversity || 0} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {speechMetrics?.vocabulary_analysis || 
                              (speechMetrics?.vocabulary_diversity && speechMetrics.vocabulary_diversity > 75
                                ? "Your vocabulary is rich and diverse, which keeps your answer engaging."
                                : speechMetrics?.vocabulary_diversity && speechMetrics.vocabulary_diversity < 50
                                ? "Consider using more varied vocabulary to make your answers more engaging."
                                : "Your vocabulary diversity is average for professional communication.")}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-brand-700">Answer Completeness</span>
                          <div className="flex items-center mt-2">
                            <Badge 
                              className={`${
                                speechMetrics?.answer_completeness === "Complete" 
                                  ? "bg-green-100 text-green-800" 
                                  : speechMetrics?.answer_completeness === "Mostly complete" 
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {speechMetrics?.answer_completeness || "Not analyzed"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {speechMetrics?.completeness_details || 
                              (speechMetrics?.answer_completeness === "Complete"
                                ? "Your answer thoroughly addressed all aspects of the question."
                                : speechMetrics?.answer_completeness === "Mostly complete"
                                ? "Your answer covered most aspects of the question, but might be missing some details."
                                : "Your answer missed important aspects of the question.")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="body-language" className="animate-in">
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-brand-800">Body Language Analysis</CardTitle>
                    <CardDescription>Visual analysis of your posture, eye contact and movement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Posture section */}
                      <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Monitor className="h-5 w-5 text-brand-600 mr-2" />
                            <h3 className="text-base font-medium text-brand-800">Posture</h3>
                          </div>
                          <span className="text-base font-semibold text-brand-700">
                            {bodyLanguage?.posture?.score || 0}/100
                          </span>
                        </div>
                        <Progress value={bodyLanguage?.posture?.score || 0} className="h-2.5 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {bodyLanguage?.posture?.evaluation || "Posture analysis unavailable"}
                        </p>
                      </div>

                      {/* Eye Contact section */}
                      <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Eye className="h-5 w-5 text-brand-600 mr-2" />
                            <h3 className="text-base font-medium text-brand-800">Eye Contact</h3>
                          </div>
                          <span className="text-base font-semibold text-brand-700">
                            {bodyLanguage?.eye_contact?.score || 0}/100
                          </span>
                        </div>
                        <Progress value={bodyLanguage?.eye_contact?.score || 0} className="h-2.5 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {bodyLanguage?.eye_contact?.score === 0 
                            ? "Eye contact detection requires clear facial visibility. Try recording with better lighting and facing the camera directly."
                            : bodyLanguage?.eye_contact?.evaluation || "Eye contact analysis unavailable"}
                        </p>
                      </div>

                      {/* Movement section */}
                      <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Activity className="h-5 w-5 text-brand-600 mr-2" />
                            <h3 className="text-base font-medium text-brand-800">Movement Control</h3>
                          </div>
                          <span className="text-base font-semibold text-brand-700">
                            {bodyLanguage?.movement?.score || 0}/100
                          </span>
                        </div>
                        <Progress value={bodyLanguage?.movement?.score || 0} className="h-2.5 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {bodyLanguage?.movement?.evaluation || "Movement analysis unavailable"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transcript" className="animate-in">
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardContent className="pt-6">
                    {analysisResults && getEmptyTranscriptMessage(analysisResults.results.transcript)}
                    
                    {analysisResults?.results?.raw_transcript && analysisResults.results.raw_transcript !== analysisResults.results.transcript && (
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-semibold text-brand-700 ">Enhanced Transcript</h3>
                          <Badge variant="secondary" className="text-xs">AI-Enhanced</Badge>
                        </div>
                        <div className="whitespace-pre-wrap rounded-md border p-4 bg-white">
                          {analysisResults.results.transcript || 'No transcript available'}
                        </div>
                        
                        <div className="mt-6 mb-2">
                          <h3 className="text-sm font-semibold text-brand-700">Raw Transcript</h3>
                        </div>
                        <div className="whitespace-pre-wrap rounded-md border p-4 bg-gray-50 text-gray-700">
                          {analysisResults.results.raw_transcript || 'No raw transcript available'}
                        </div>
                      </div>
                    )}
                    
                    {(!analysisResults?.results?.raw_transcript || analysisResults.results.raw_transcript === analysisResults.results.transcript) && (
                      <div className="whitespace-pre-wrap">
                        {analysisResults?.results?.transcript || 'No transcript available'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            </>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          {saveError && (
            <div className="w-full text-center mb-2">
              <Badge variant="destructive" className="mb-2">Database Error</Badge>
              <p className="text-sm text-red-600">Failed to save results: {saveError}</p>
            </div>
          )}
          
          {isSaved && (
            <div className="w-full text-center mb-2">
              <Badge variant="success" className="mb-2 bg-green-100 text-green-800 hover:bg-green-200">Saved to Your History</Badge>
              <p className="text-sm text-green-600">Your practice results have been saved and will appear in your dashboard.</p>
            </div>
          )}
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>

          <Button
            size="lg"
            onClick={() => router.push("/practice")}
            className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ListChecks className="mr-2 h-4 w-4" />
            Practice More Questions
          </Button>
        </div>
      </div>
    </div>
  )
}
