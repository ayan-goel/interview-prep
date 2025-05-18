"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChevronLeft, Home, ListChecks, Sparkles, ThumbsUp, ThumbsDown, Clock, Volume2, Monitor, Eye, Activity } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { getAnalysisResults } from "@/lib/api-service"

interface AnalysisResults {
  analysis_id: string;
  results: {
    question: string;
    transcript: string;
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
    }>;
    improvements: Array<{
      category: string;
      description: string;
      advice: string;
    }>;
    speech_metrics: {
      speaking_rate: number;
      vocabulary_diversity: number;
      answer_completeness: string;
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
  };
}

export default function AIFeedbackPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)  
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // Load analysis results
  useEffect(() => {
    if (!isLoading) {
      try {
        const results = getAnalysisResults();
        
        if (!results) {
          // No analysis data in storage, redirect back to practice
          console.log("No analysis data found, redirecting to practice page");
          setError("Analysis data not found. Please record a new interview.");
          return;
        }
        
        console.log("Loaded analysis results:", results);
        setAnalysisResults(results);
        
        // Simulate progress for UX purposes
        // In a production app, you might show progress based on backend updates
      const interval = setInterval(() => {
        setAnalysisProgress((prev) => {
            const newProgress = prev + 5;
          if (newProgress >= 100) {
              clearInterval(interval);
              setIsAnalyzing(false);
              return 100;
          }
            return newProgress;
          });
        }, 200);

        return () => clearInterval(interval);
      } catch (error) {
        console.error("Error loading analysis results:", error);
        setError("Failed to load analysis results. Please try again.");
        setIsAnalyzing(false);
      }
    }
  }, [isLoading, router]);

  // Early return if still loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-brand-50">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-brand-500 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-medium text-brand-700">Loading...</p>
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
                    <Sparkles className="h-12 w-12 text-brand-500 animate-pulse" />
                  </div>
                  <p className="text-center text-muted-foreground">Analyzing your response...</p>
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">{analysisProgress}% complete</p>
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
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                      <CardTitle className="text-lg text-brand-800">Strengths</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 list-disc pl-5">
                        {strengths.map((strength, index) => (
                          <li key={index} className="text-muted-foreground">
                            <span className="text-brand-800 font-medium">{strength.category}:</span> {strength.description}
                      </li>
                        ))}
                    </ul>
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
                    <ul className="space-y-2 list-disc pl-5">
                        {improvements.map((improvement, index) => (
                          <li key={index} className="text-muted-foreground">
                            <span className="text-brand-800 font-medium">{improvement.category}:</span> {improvement.description}
                            {improvement.advice && (
                              <div className="text-sm mt-1 text-brand-600">{improvement.advice}</div>
                            )}
                      </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="animate-in">
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm font-medium text-brand-700">Speaking Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {speechMetrics?.speaking_rate || 0} words per minute
                          </span>
                      </div>
                        <Progress 
                          value={Math.min(100, (speechMetrics?.speaking_rate || 0) / 2)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">
                          {speechMetrics?.speaking_rate && speechMetrics.speaking_rate > 160 
                            ? "Your pace is slightly fast. Try to slow down a bit." 
                            : speechMetrics?.speaking_rate && speechMetrics.speaking_rate < 120
                            ? "Your pace is a bit slow. Try to be more energetic."
                            : "Your pace is within an effective range. Ideal: 120-160 wpm."}
                        </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm font-medium text-brand-700">Filler Words</span>
                          <span className="text-sm text-muted-foreground">
                            {speechMetrics?.filler_words?.total || 0} instances
                          </span>
                      </div>
                        <Progress 
                          value={Math.max(0, 100 - (speechMetrics?.filler_words?.total || 0) * 5)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">
                          {speechMetrics?.filler_words?.total && speechMetrics.filler_words.total > 10
                            ? "High usage of filler words. Try to reduce these for more polished delivery."
                            : speechMetrics?.filler_words?.total && speechMetrics.filler_words.total > 5
                            ? "Moderate usage of filler words. Try to reduce these for more polished delivery."
                            : "Good control of filler words. Your speech sounds polished and confident."}
                        </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm font-medium text-brand-700">Answer Completeness</span>
                          <span className="text-sm text-muted-foreground">
                            {speechMetrics?.answer_completeness || "Partial"}
                          </span>
                      </div>
                        <Progress 
                          value={
                            speechMetrics?.answer_completeness?.includes("Complete") ? 90 :
                            speechMetrics?.answer_completeness?.includes("Mostly") ? 75 :
                            speechMetrics?.answer_completeness?.includes("Partially") ? 50 : 30
                          } 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">
                          {speechMetrics?.answer_completeness?.includes("Complete")
                            ? "You provided a thorough answer that addressed all aspects of the question."
                            : speechMetrics?.answer_completeness?.includes("Mostly")
                            ? "You addressed most aspects of the question, but could elaborate further in some areas."
                            : "Your answer was incomplete. Make sure to address all parts of the question."}
                        </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                          <span className="text-sm font-medium text-brand-700">Vocabulary Diversity</span>
                          <span className="text-sm text-muted-foreground">
                            {speechMetrics?.vocabulary_diversity ? 
                              speechMetrics.vocabulary_diversity > 85 ? "High" :
                              speechMetrics.vocabulary_diversity > 70 ? "Good" :
                              speechMetrics.vocabulary_diversity > 50 ? "Average" : "Limited"
                            : "Average"}
                          </span>
                      </div>
                        <Progress value={speechMetrics?.vocabulary_diversity || 70} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {speechMetrics?.vocabulary_diversity && speechMetrics.vocabulary_diversity > 85
                            ? "Excellent use of varied vocabulary that demonstrates strong command of language."
                            : speechMetrics?.vocabulary_diversity && speechMetrics.vocabulary_diversity > 70
                            ? "Good vocabulary diversity. Your language is varied and appropriate."
                            : "Consider using more varied vocabulary to demonstrate language proficiency."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="body-language" className="animate-in">
                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Monitor className="h-4 w-4 text-brand-600 mr-2" />
                            <span className="text-sm font-medium text-brand-700">Posture</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {bodyLanguage?.posture?.score || 0}/100
                          </span>
                      </div>
                        <Progress value={bodyLanguage?.posture?.score || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {bodyLanguage?.posture?.evaluation || "Posture analysis unavailable"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 text-brand-600 mr-2" />
                            <span className="text-sm font-medium text-brand-700">Eye Contact</span>
                      </div>
                          <span className="text-sm text-muted-foreground">
                            {bodyLanguage?.eye_contact?.score || 0}/100
                          </span>
                    </div>
                        <Progress value={bodyLanguage?.eye_contact?.score || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {bodyLanguage?.eye_contact?.evaluation || "Eye contact analysis unavailable"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-brand-600 mr-2" />
                            <span className="text-sm font-medium text-brand-700">Movement Control</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {bodyLanguage?.movement?.score || 0}/100
                          </span>
                        </div>
                        <Progress value={bodyLanguage?.movement?.score || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {bodyLanguage?.movement?.evaluation || "Movement analysis unavailable"}
                        </p>
                        </div>

                      <div className="mt-4 pt-4 border-t border-brand-100">
                        <h4 className="text-sm font-medium text-brand-800 mb-2">Overall Body Language Assessment</h4>
                        <p className="text-sm text-muted-foreground">
                          {bodyLanguage?.posture?.score && bodyLanguage?.eye_contact?.score && bodyLanguage?.movement?.score ? (
                            `Your body language ${
                              (bodyLanguage.posture.score + bodyLanguage.eye_contact.score + bodyLanguage.movement.score) / 3 > 80 ? 
                              "projects confidence and engagement" : 
                              (bodyLanguage.posture.score + bodyLanguage.eye_contact.score + bodyLanguage.movement.score) / 3 > 60 ?
                              "is generally positive but could be improved" :
                              "needs significant improvement"
                            }. Focus on ${
                              Math.min(bodyLanguage.posture.score, bodyLanguage.eye_contact.score, bodyLanguage.movement.score) === bodyLanguage.posture.score ?
                              "improving your posture" :
                              Math.min(bodyLanguage.posture.score, bodyLanguage.eye_contact.score, bodyLanguage.movement.score) === bodyLanguage.eye_contact.score ?
                              "maintaining better eye contact" :
                              "controlling your movements"
                            } to create a more professional impression.`
                          ) : (
                            "Body language analysis requires video recording. Make sure your camera is enabled during the interview."
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="transcript" className="animate-in">
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Auto-generated transcript of your answer:</p>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Volume2 className="h-4 w-4" />
                          <span className="text-xs">Read Aloud</span>
                    </Button>
                  </div>
                      <div className="text-brand-800 prose prose-blue max-w-none space-y-4">
                        {results?.transcript ? (
                          <p>"{results.transcript}"</p>
                        ) : (
                          <p className="text-muted-foreground">Transcript unavailable</p>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
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
