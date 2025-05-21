"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ChevronLeft, Home, ListChecks, Sparkles, ThumbsUp, ThumbsDown, Clock, Volume2, Monitor, Eye, Activity, AlertCircle, TrendingUp, Layers, BarChart, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { savePracticeResults } from "@/lib/api-service"
import { useToast } from "@/components/ui/use-toast"
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip as ChartTooltip, 
  Legend,
  RadialLinearScale,
  RadarController,
  ArcElement
} from 'chart.js'
import { Radar, Bar, Doughnut } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  ChartTooltip, 
  Legend,
  RadialLinearScale,
  RadarController,
  ArcElement
)

export default function MockInterviewResultsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [questions, setQuestions] = useState<string[]>([])
  const [questionResults, setQuestionResults] = useState<{[key: string]: any}>({})
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0)
  const [averageScores, setAverageScores] = useState({
    overall: 0,
    content: 0,
    structure: 0,
    delivery: 0,
    confidence: 0
  })
  const saveAttemptedRef = useRef(false)

  // Load results from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedQuestions = localStorage.getItem('mockInterviewQuestions')
      const storedCompleted = localStorage.getItem('mockInterviewCompleted')
      
      if (!storedQuestions || !storedCompleted) {
        router.push('/practice/mock')
        return
      }
      
      const parsedQuestions = JSON.parse(storedQuestions)
      const parsedResults = JSON.parse(storedCompleted)
      
      setQuestions(parsedQuestions)
      setQuestionResults(parsedResults)
      
      // Calculate average scores
      const scores = {
        overall: 0,
        content: 0, 
        structure: 0,
        delivery: 0,
        confidence: 0
      }
      
      let questionCount = 0
      
      // Go through each question's results
      Object.values(parsedResults).forEach((result: any) => {
        if (result && typeof result === 'object' && result.scores) {
          scores.content += result.scores.content || 0
          scores.structure += result.scores.structure || 0
          scores.delivery += result.scores.delivery || 0
          scores.confidence += result.scores.confidence || 0
          scores.overall += result.scores.overall || 0
          questionCount++
        }
      })
      
      if (questionCount > 0) {
        setAverageScores({
          overall: Math.round(scores.overall / questionCount),
          content: Math.round(scores.content / questionCount),
          structure: Math.round(scores.structure / questionCount),
          delivery: Math.round(scores.delivery / questionCount),
          confidence: Math.round(scores.confidence / questionCount)
        })
      }
      
      setIsLoading(false)
    }
  }, [router])

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/signin")
    }
  }, [user, router])

  // Handle save all results to database
  useEffect(() => {
    if (!isLoading && user && Object.keys(questionResults).length > 0 && !saveAttemptedRef.current) {
      saveAttemptedRef.current = true
      saveAllResultsToDatabase()
    }
  }, [isLoading, user, questionResults])

  const saveAllResultsToDatabase = async () => {
    try {
      if (!user || !user.id) {
        return
      }
      
      // Save each question's results
      for (const [question, result] of Object.entries(questionResults)) {
        if (result && typeof result === 'object' && result.scores) {
          try {
            await savePracticeResults(user.id, { 
              analysis_id: result.analysis_id || `mock-${Date.now()}`,
              results: result 
            })
          } catch (err) {
            console.error(`Error saving result for question: ${question}`, err)
          }
        }
      }
      
      toast({
        title: "Results Saved",
        description: "Your interview results have been saved to your profile.",
        duration: 3000
      })
    } catch (error) {
      console.error("Error saving results:", error)
      toast({
        variant: "destructive",
        title: "Failed to Save Results",
        description: "There was a problem saving your results. Your data is still available locally.",
        duration: 4000
      })
    }
  }

  const handleQuestionSelect = (index: number) => {
    setSelectedQuestionIndex(index)
    setActiveTab('details')
  }

  const startNewInterview = () => {
    // Clear stored data
    localStorage.removeItem('mockInterviewQuestions')
    localStorage.removeItem('mockInterviewResults')
    localStorage.removeItem('mockInterviewCompleted')
    localStorage.removeItem('mockInterviewCurrentIndex')
    
    // Redirect to practice page instead of setup
    router.push('/practice')
  }
  
  // Get color class based on score
  const getScoreColorClass = (score: number) => {
    if (score >= 85) return "text-green-600"
    if (score >= 70) return "text-emerald-600"
    if (score >= 60) return "text-amber-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }
  
  // Get background color based on score
  const getScoreBgClass = (score: number) => {
    if (score >= 85) return "bg-green-50 border-green-200"
    if (score >= 70) return "bg-emerald-50 border-emerald-200"
    if (score >= 60) return "bg-amber-50 border-amber-200" 
    if (score >= 40) return "bg-orange-50 border-orange-200"
    return "bg-red-50 border-red-200"
  }

  // Format timestamps for display
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return ""
    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  // Prepare radar chart data for overview
  const radarData = {
    labels: ['Content', 'Structure', 'Delivery', 'Confidence'],
    datasets: [
      {
        label: 'Average Performance',
        data: [
          averageScores.content,
          averageScores.structure,
          averageScores.delivery,
          averageScores.confidence
        ],
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
      }
    ]
  }
  
  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          showLabelBackdrop: false,
          font: {
            size: 10
          }
        },
        pointLabels: {
          font: {
            size: 12
          }
        },
        grid: {
          circular: true
        },
        angleLines: {
          display: true
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  }

  const getSelectedQuestionResults = () => {
    if (selectedQuestionIndex < 0 || selectedQuestionIndex >= questions.length) {
      return null
    }
    
    const question = questions[selectedQuestionIndex]
    return questionResults[question] || null
  }

  const selectedResults = getSelectedQuestionResults()

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-brand-50 flex justify-center items-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-brand-800">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/practice"
              className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Practice
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight gradient-text">Interview Results</h1>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Question Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-lg shadow-lg border border-brand-100">
              <CardHeader>
                <CardTitle className="text-2xl text-brand-800 flex items-center gap-2">
                  <BarChart className="h-6 w-6 text-brand-600" />
                  Mock Interview Summary
                </CardTitle>
                <CardDescription className="text-brand-600">
                  You completed {Object.keys(questionResults).length} of {questions.length} questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Performance Card - MATCH AI FEEDBACK PAGE */}
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
                          strokeDashoffset={352.56 - (352.56 * (averageScores.overall || 0) / 100)}
                        />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-brand-800">
                        {Math.round(averageScores.overall || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Content</p>
                        <p className="text-lg font-medium text-brand-800">{averageScores.content || 0}/100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Delivery</p>
                        <p className="text-lg font-medium text-brand-800">{averageScores.delivery || 0}/100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Structure</p>
                        <p className="text-lg font-medium text-brand-800">{averageScores.structure || 0}/100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-lg font-medium text-brand-800">{averageScores.confidence || 0}/100</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Radar Chart in the middle */}
                <div className="flex justify-center mt-8">
                  <div className="w-full max-w-md">
                    <Radar 
                      data={radarData} 
                      options={{
                        ...radarOptions,
                        plugins: { 
                          ...radarOptions.plugins,
                          tooltip: { 
                            enabled: true,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#333',
                            bodyColor: '#333',
                            borderColor: '#ddd',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                              label: (context: any) => `Score: ${context.raw}/100`
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button 
                  onClick={startNewInterview} 
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Return to Practice
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <Card className="bg-white/95 backdrop-blur-lg shadow-lg border border-brand-100">
              <CardHeader className="gap-2">
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium">Question {selectedQuestionIndex + 1} of {questions.length}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
                      disabled={selectedQuestionIndex <= 0}
                      className="h-7 px-2"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedQuestionIndex(Math.min(questions.length - 1, selectedQuestionIndex + 1))}
                      disabled={selectedQuestionIndex >= questions.length - 1}
                      className="h-7 px-2"
                    >
                      Next
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl">{questions[selectedQuestionIndex]}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedResults ? (
                  <>
                    {/* Score Overview - MATCH AI FEEDBACK PAGE */}
                    <div className="grid sm:grid-cols-5 gap-4 mb-6">
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
                              strokeDashoffset={352.56 - (352.56 * (selectedResults.scores.overall || 0) / 100)}
                            />
                          </svg>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-brand-800">
                            {Math.round(selectedResults.scores.overall || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Content</p>
                            <p className="text-lg font-medium text-brand-800">{selectedResults.scores.content || 0}/100</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Delivery</p>
                            <p className="text-lg font-medium text-brand-800">{selectedResults.scores.delivery || 0}/100</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Structure</p>
                            <p className="text-lg font-medium text-brand-800">{selectedResults.scores.structure || 0}/100</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <p className="text-lg font-medium text-brand-800">{selectedResults.scores.confidence || 0}/100</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tabs for detailed feedback */}
                    <Tabs defaultValue="feedback" className="mt-6">
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

                      {/* Detailed Feedback Tab */}
                      <TabsContent value="feedback" className="animate-in">
                        <div className="space-y-6">
                          {selectedResults.key_takeaways && selectedResults.key_takeaways.length > 0 && (
                            <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                              <CardHeader className="pb-3">
                                <div className="flex items-center">
                                  <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
                                  <CardTitle className="text-lg text-brand-800">Key Takeaways</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-4">
                                  {selectedResults.key_takeaways.sort((a: any, b: any) => a.priority - b.priority).map((takeaway: any, index: number) => (
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

                          {/* Strengths */}
                          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md mb-6">
                            <CardHeader className="pb-3">
                              <div className="flex items-center">
                                <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                                <CardTitle className="text-lg text-brand-800">Strengths</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                {selectedResults.strengths && selectedResults.strengths.length > 0 ? (
                                  selectedResults.strengths.map((strength: any, index: number) => (
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
                                  ))
                                ) : (
                                  <p className="text-muted-foreground text-sm italic">No specific strengths identified.</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Areas for Improvement */}
                          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                            <CardHeader className="pb-3">
                              <div className="flex items-center">
                                <ThumbsDown className="h-5 w-5 text-amber-500 mr-2" />
                                <CardTitle className="text-lg text-brand-800">Areas for Improvement</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                {selectedResults.improvements && selectedResults.improvements.length > 0 ? (
                                  selectedResults.improvements.map((improvement: any, index: number) => (
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
                                  ))
                                ) : (
                                  <p className="text-muted-foreground text-sm italic">No specific improvements identified.</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Speech Metrics Tab */}
                      <TabsContent value="metrics" className="animate-in">
                        <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                          <CardContent className="pt-6">
                            <div className="space-y-6">
                              {selectedResults.speech_metrics && (
                                <>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-brand-700">Speaking Rate</span>
                                      <Badge variant="outline" className="text-brand-700">
                                        {selectedResults.speech_metrics.speaking_rate || 0} words/min
                                      </Badge>
                                    </div>
                                    <Progress 
                                      value={Math.min(100, (selectedResults.speech_metrics.speaking_rate || 0) / 2)} 
                                      className="h-2" 
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {selectedResults.speech_metrics.pace_analysis || 
                                        (selectedResults.speech_metrics.speaking_rate && selectedResults.speech_metrics.speaking_rate > 160 
                                          ? "Your pace is slightly fast. Try to slow down a bit." 
                                          : selectedResults.speech_metrics.speaking_rate && selectedResults.speech_metrics.speaking_rate < 120
                                          ? "Your pace is slightly slow. Try to speak a bit faster."
                                          : "Your speaking pace is good for interview settings.")}
                                    </p>
                                  </div>

                                  <div className="border-t border-gray-100 pt-4">
                                    <div className="text-sm font-medium text-brand-700 mb-3">Filler Words</div>
                                    <div className="bg-gray-50 rounded-md p-3">
                                      <div className="flex justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">Total filler words used:</span>
                                        <Badge variant={selectedResults.speech_metrics.filler_words?.total === 0 ? "success" : 
                                                     selectedResults.speech_metrics.filler_words?.total && selectedResults.speech_metrics.filler_words?.total < 5 ? "outline" : "destructive"}>
                                          {selectedResults.speech_metrics.filler_words?.total || 0}
                                        </Badge>
                                      </div>
                                      {selectedResults.speech_metrics.filler_words?.total > 0 && selectedResults.speech_metrics.filler_words?.details ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-2 mt-3">
                                            {Object.entries(selectedResults.speech_metrics.filler_words.details || {}).map(([word, count]) => (
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
                                          {selectedResults.speech_metrics.vocabulary_diversity || 0}/100
                                        </Badge>
                                      </div>
                                      <Progress value={selectedResults.speech_metrics.vocabulary_diversity || 0} className="h-2" />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {selectedResults.speech_metrics.vocabulary_analysis || 
                                          (selectedResults.speech_metrics.vocabulary_diversity && selectedResults.speech_metrics.vocabulary_diversity > 75
                                            ? "Your vocabulary is rich and diverse, which keeps your answer engaging."
                                            : selectedResults.speech_metrics.vocabulary_diversity && selectedResults.speech_metrics.vocabulary_diversity < 50
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
                                            selectedResults.speech_metrics.answer_completeness === "Complete" 
                                              ? "bg-green-100 text-green-800" 
                                              : selectedResults.speech_metrics.answer_completeness === "Mostly complete" 
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {selectedResults.speech_metrics.answer_completeness || "Not analyzed"}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {selectedResults.speech_metrics.completeness_details || 
                                          (selectedResults.speech_metrics.answer_completeness === "Complete"
                                            ? "Your answer thoroughly addressed all aspects of the question."
                                            : selectedResults.speech_metrics.answer_completeness === "Mostly complete"
                                            ? "Your answer covered most aspects of the question, but might be missing some details."
                                            : "Your answer missed important aspects of the question.")}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              )}
                              {!selectedResults.speech_metrics && (
                                <div className="p-12 text-center">
                                  <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <h3 className="text-xl font-medium mb-2">Speech Metrics Not Available</h3>
                                  <p className="text-muted-foreground max-w-md mx-auto">
                                    Speech metrics analysis is not available for this answer.
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Body Language Tab */}
                      <TabsContent value="body-language" className="animate-in">
                        <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                          <CardHeader>
                            <CardTitle className="text-xl text-brand-800">Body Language Analysis</CardTitle>
                            <CardDescription>Visual analysis of your posture, eye contact and movement</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {selectedResults.body_language ? (
                              <div className="space-y-6">
                                {/* Posture section */}
                                <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                      <Monitor className="h-5 w-5 text-brand-600 mr-2" />
                                      <h3 className="text-base font-medium text-brand-800">Posture</h3>
                                    </div>
                                    <span className="text-base font-semibold text-brand-700">
                                      {selectedResults.body_language.posture?.score || 0}/100
                                    </span>
                                  </div>
                                  <Progress value={selectedResults.body_language.posture?.score || 0} className="h-2.5 mb-3" />
                                  <p className="text-sm text-muted-foreground">
                                    {selectedResults.body_language.posture?.evaluation || "Posture analysis unavailable"}
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
                                      {selectedResults.body_language.eye_contact?.score || 0}/100
                                    </span>
                                  </div>
                                  <Progress value={selectedResults.body_language.eye_contact?.score || 0} className="h-2.5 mb-3" />
                                  <p className="text-sm text-muted-foreground">
                                    {selectedResults.body_language.eye_contact?.score === 0 
                                      ? "Eye contact detection requires clear facial visibility. Try recording with better lighting and facing the camera directly."
                                      : selectedResults.body_language.eye_contact?.evaluation || "Eye contact analysis unavailable"}
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
                                      {selectedResults.body_language.movement?.score || 0}/100
                                    </span>
                                  </div>
                                  <Progress value={selectedResults.body_language.movement?.score || 0} className="h-2.5 mb-3" />
                                  <p className="text-sm text-muted-foreground">
                                    {selectedResults.body_language.movement?.evaluation || "Movement analysis unavailable"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-12 text-center">
                                <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">Body Language Analysis Not Available</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                  Body language analysis is not available for this answer.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Transcript Tab */}
                      <TabsContent value="transcript" className="animate-in">
                        <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                          <CardContent className="pt-6">
                            {selectedResults.raw_transcript && selectedResults.raw_transcript !== selectedResults.transcript && (
                              <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-sm font-semibold text-brand-700 ">Enhanced Transcript</h3>
                                  <Badge variant="secondary" className="text-xs">AI-Enhanced</Badge>
                                </div>
                                <div className="whitespace-pre-wrap rounded-md border p-4 bg-white">
                                  {selectedResults.transcript || 'No transcript available'}
                                </div>
                                
                                <div className="mt-6 mb-2">
                                  <h3 className="text-sm font-semibold text-brand-700">Raw Transcript</h3>
                                </div>
                                <div className="whitespace-pre-wrap rounded-md border p-4 bg-gray-50 text-gray-700">
                                  {selectedResults.raw_transcript || 'No raw transcript available'}
                                </div>
                              </div>
                            )}
                            
                            {(!selectedResults.raw_transcript || selectedResults.raw_transcript === selectedResults.transcript) && (
                              <div className="whitespace-pre-wrap">
                                {selectedResults.transcript || 'No transcript available'}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">No Result Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      You haven't answered this question yet. Complete the mock interview to see results for all questions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 