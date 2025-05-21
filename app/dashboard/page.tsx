"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Calendar, ArrowUpRight, Clock, BarChart3, Search, FileBarChart, ThumbsUp, ThumbsDown, Monitor, Eye, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserPracticeHistory, getUserStats, getQuestionHistory, getCategoryPerformance } from "@/lib/api-service"
import { Line, Bar } from "react-chartjs-2"
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
  ChartData,
  ChartOptions
} from 'chart.js'
import { Progress } from "@/components/ui/progress"

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  ChartTooltip, 
  Legend
)

// Types for the data structure
interface QuestionData {
  id: string;
  text: string;
  category: string;
  attempts: number;
  lastScore: number;
  scoreHistory: Array<{date: string, score: number}>;
  feedback: Array<{
    date: string,
    score: number,
    strengths: string,
    improvements: string,
    scores: {
      content: number,
      structure: number,
      delivery: number,
      confidence: number,
      overall: number
    },
    transcript: string,
    raw_transcript: string,
    speech_metrics: any,
    body_language: any
  }>;
}

interface UserStats {
  totalSessions: number;
  averageScore: number;
  improvement: number;
  practiceTimeHours: number;
}

export default function DashboardPage() {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [userQuestions, setUserQuestions] = useState<QuestionData[]>([])
  const [questionDetails, setQuestionDetails] = useState<QuestionData | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [scoreData, setScoreData] = useState<Array<{date: string, score: number | null}>>([])
  const [categoryData, setCategoryData] = useState<Array<{name: string, score: number}>>([])
  const [practiceFrequency, setPracticeFrequency] = useState<Array<{label: string, count: number}>>([])
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null)
  const [attemptDetails, setAttemptDetails] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [questionLimit, setQuestionLimit] = useState<number>(15)
  const [customLimit, setCustomLimit] = useState<string>("")
  const [showCustomLimit, setShowCustomLimit] = useState<boolean>(false)
  const router = useRouter()
  const { user } = useAuth()

  // Load user's practice data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Load user stats
        const userStats = await getUserStats(user.id);
        
        // Load practice history
        const practiceHistory = await getUserPracticeHistory(user.id);
        
        // Calculate actual improvement percentage by comparing last 3 questions with previous 3
        if (practiceHistory && practiceHistory.length >= 6) {
          // Sort by date, newest first
          const sortedSessions = [...practiceHistory].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          // Get last 3 questions and calculate average
          const lastThree = sortedSessions.slice(0, 3);
          const lastThreeAvg = lastThree.reduce((sum, session) => sum + (session.overall_score || 0), 0) / 3;
          
          // Get previous 3 questions and calculate average
          const prevThree = sortedSessions.slice(3, 6);
          const prevThreeAvg = prevThree.reduce((sum, session) => sum + (session.overall_score || 0), 0) / 3;
          
          // Calculate percentage change, handle divide by zero
          let improvementPct = 0;
          if (prevThreeAvg > 0) {
            improvementPct = ((lastThreeAvg - prevThreeAvg) / prevThreeAvg) * 100;
          }
          
          // Update stats with calculated improvement
          userStats.improvement = improvementPct;
        } else if (practiceHistory.length > 0) {
          // Not enough data for comparison
          userStats.improvement = 0;
        }
        
        setStats(userStats);
        
        // Process practice history into questions
        const questionMap = new Map<string, any>();
        
        practiceHistory.forEach((session: any) => {
          const questionId = session.question_id;
          const questionText = session.questions?.text || "Unknown Question";
          const questionCategory = session.questions?.category || "General";
          const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
          
          if (!questionMap.has(questionId)) {
            questionMap.set(questionId, {
              id: questionId,
              text: questionText,
              category: questionCategory,
              attempts: 0,
              lastScore: 0,
              scoreHistory: [],
              feedback: []
            });
          }
          
          const questionData = questionMap.get(questionId);
          questionData.attempts += 1;
          questionData.lastScore = session.overall_score;
          
          // Add to score history
          questionData.scoreHistory.push({
            date: sessionDate,
            score: session.overall_score
          });
          
          // Process strengths and improvements for feedback
          let strengths = "";
          let improvements = "";
          
          try {
            const strengthsArray = JSON.parse(session.strengths);
            if (Array.isArray(strengthsArray)) {
              strengths = strengthsArray.map((s: any) => s.description).join("; ");
            }
          } catch (e) {}
          
          try {
            const improvementsArray = JSON.parse(session.improvements);
            if (Array.isArray(improvementsArray)) {
              improvements = improvementsArray.map((i: any) => i.description).join("; ");
            }
          } catch (e) {}
          
          // Add to feedback
          questionData.feedback.push({
            date: session.created_at,
            score: session.overall_score,
            strengths,
            improvements,
            scores: {
              content: session.content_score || 0,
              structure: session.structure_score || 0,
              delivery: session.delivery_score || 0,
              confidence: session.confidence_score || 0,
              overall: session.overall_score || 0
            },
            transcript: session.transcript || '',
            raw_transcript: session.raw_transcript || '',
            speech_metrics: session.speech_metrics ? JSON.parse(session.speech_metrics) : {},
            body_language: session.body_language ? JSON.parse(session.body_language) : {}
          });
        });
        
        // Convert Map to array and sort by most recent
        const questionsArray = Array.from(questionMap.values());
        questionsArray.forEach(q => {
          q.scoreHistory.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          q.feedback.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
        
        setUserQuestions(questionsArray);
        
        // Set the first question as selected if available
        if (questionsArray.length > 0) {
          setSelectedQuestion(questionsArray[0].id);
          setQuestionDetails(questionsArray[0]);
        }
        
        // Process all practice sessions chronologically for score trend
        const allSessions = [...practiceHistory].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Get recent sessions based on limit
        const recentSessions = allSessions.slice(-questionLimit);
        
        // Format for chart
        const trendData = recentSessions.map(session => ({
          date: new Date(session.created_at).toISOString().split('T')[0],
          score: session.overall_score || 0
        }));
        
        setScoreData(trendData);
        
        // Load category performance
        const categoryScores = await getCategoryPerformance(user.id);
        setCategoryData(categoryScores);
        
        // Calculate performance breakdown (content, structure, delivery, confidence)
        const performanceBreakdown = [
          { name: 'Content', score: 0, total: 0 },
          { name: 'Structure', score: 0, total: 0 },
          { name: 'Delivery', score: 0, total: 0 },
          { name: 'Confidence', score: 0, total: 0 },
        ];
        // Only use the last 10 sessions for the breakdown
        const lastTenSessions = practiceHistory
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        lastTenSessions.forEach((session: any) => {
          if (session.content_score) {
            performanceBreakdown[0].score += session.content_score;
            performanceBreakdown[0].total += 1;
          }
          if (session.structure_score) {
            performanceBreakdown[1].score += session.structure_score;
            performanceBreakdown[1].total += 1;
          }
          if (session.delivery_score) {
            performanceBreakdown[2].score += session.delivery_score;
            performanceBreakdown[2].total += 1;
          }
          if (session.confidence_score) {
            performanceBreakdown[3].score += session.confidence_score;
            performanceBreakdown[3].total += 1;
          }
        });
        
        // Calculate averages and format for chart
        const breakdownData = performanceBreakdown.map(item => ({
          name: item.name,
          score: item.total > 0 ? Math.round(item.score / item.total) : 0
        }));
        
        setCategoryData(breakdownData);

        // Calculate practice frequency for each of the past 7 days
        const frequencyData: { label: string, count: number }[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const count = practiceHistory.filter((session: any) => {
            const sessionDate = new Date(session.created_at);
            return sessionDate >= dayStart && sessionDate <= dayEnd;
          }).length;
          // Label as e.g. 'Mon' or '6/10'
          const label = `${day.getMonth() + 1}/${day.getDate()}`;
          frequencyData.push({ label, count });
        }
        setPracticeFrequency(frequencyData);
        
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [user]);

  // Update score data when question limit changes
  useEffect(() => {
    if (!user) return;
    
    const updateScoreData = async () => {
      try {
        const practiceHistory = await getUserPracticeHistory(user.id);
        
        // Process all practice sessions chronologically for score trend
        const allSessions = [...practiceHistory].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Get recent sessions based on limit
        const recentSessions = allSessions.slice(-questionLimit);
        
        // Format for chart
        const trendData = recentSessions.map(session => ({
          date: new Date(session.created_at).toISOString().split('T')[0],
          score: session.overall_score || 0
        }));
        
        setScoreData(trendData);
      } catch (error) {
        console.error("Error updating score data:", error);
      }
    };
    
    updateScoreData();
  }, [questionLimit, user]);

  // Update the selected question details
  useEffect(() => {
    if (selectedQuestion && user) {
      const question = userQuestions.find(q => q.id === selectedQuestion);
      if (question) {
        setQuestionDetails(question);
        // Default to showing the most recent attempt
        setSelectedAttempt(0);
        if (question.feedback && question.feedback.length > 0) {
          setAttemptDetails(question.feedback[0]);
        } else {
          setAttemptDetails(null);
        }
      }
    }
  }, [selectedQuestion, userQuestions, user]);

  // Handle selecting a specific attempt
  const handleAttemptSelect = (index: number) => {
    if (questionDetails && questionDetails.feedback && questionDetails.feedback[index]) {
      setSelectedAttempt(index);
      setAttemptDetails(questionDetails.feedback[index]);
    }
  };

  // Chart data for score trend
  const scoreTrendChartData = {
    labels: scoreData.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Score',
        data: scoreData.map(item => item.score !== null ? Math.round(item.score) : null),
        fill: false,
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
      },
    ],
  };

  const scoreTrendOptions: ChartOptions<'line'> = {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: 'rgba(200, 200, 200, 0.75)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
  };

  // Chart data for category performance breakdown
  const categoryChartData = {
    labels: categoryData.map(item => item.name),
    datasets: [
      {
        label: 'Score',
        data: categoryData.map(item => Math.round(item.score)),
        backgroundColor: [
          'rgba(139, 92, 246, 0.7)', // purple for content
          'rgba(59, 130, 246, 0.7)', // blue for structure
          'rgba(16, 185, 129, 0.7)', // green for delivery 
          'rgba(249, 115, 22, 0.7)', // orange for confidence
        ],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const categoryChartOptions: ChartOptions<'bar'> = {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // Chart data for practice frequency
  const frequencyChartData = {
    labels: practiceFrequency.map(item => item.label),
    datasets: [
      {
        label: 'Questions',
        data: practiceFrequency.map(item => item.count),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const frequencyChartOptions: ChartOptions<'bar'> = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // Chart data for question score history
  const questionScoreChartData = questionDetails ? {
    labels: questionDetails.scoreHistory.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Score',
        data: questionDetails.scoreHistory.map(item => Math.round(item.score)),
        fill: false,
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
      },
    ],
  } : null;

  const questionScoreChartOptions: ChartOptions<'line'> = {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // Redirect if not authenticated
  if (!user) {
    router.push("/signin")
    return null
  }

  // Handler for changing question limit
  const handleLimitChange = (value: string) => {
    if (value === "custom") {
      setShowCustomLimit(true);
    } else {
      setShowCustomLimit(false);
      setQuestionLimit(parseInt(value));
    }
  };

  // Handler for custom limit input
  const handleCustomLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomLimit(e.target.value);
  };

  // Handler for applying custom limit
  const applyCustomLimit = () => {
    const limit = parseInt(customLimit);
    if (!isNaN(limit) && limit > 0) {
      setQuestionLimit(limit);
    }
  };

  // Filter questions based on search
  const filteredQuestions = userQuestions.filter(
    (question) =>
      question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">Your Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Track your progress and review your interview practice history.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-brand-800">Total Practice Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-brand-900">{stats?.totalSessions || 0}</p>
                  <p className="text-sm text-muted-foreground">Your interview practice questions</p>
                </div>
                <Calendar className="h-8 w-8 text-brand-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-brand-800">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-brand-900">
                    {stats?.averageScore ? Math.round(stats.averageScore) : 0}<span className="text-xl">/100</span>
                  </p>
                  <p className={`text-sm ${stats?.improvement && stats.improvement > 0 ? 'text-green-600' : stats?.improvement && stats.improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {stats?.improvement !== undefined
                      ? (stats.improvement > 0 
                          ? `↑ ${Math.round(Math.abs(stats.improvement))}% improvement` 
                          : stats.improvement < 0 
                            ? `↓ ${Math.round(Math.abs(stats.improvement))}% decrease`
                            : 'No change')
                      : 'Insufficient data'}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-brand-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-brand-800">Practice Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-brand-900">
                    {stats?.practiceTimeHours?.toFixed(1) || 0}<span className="text-xl">hrs</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Estimated practice time</p>
                </div>
                <Clock className="h-8 w-8 text-brand-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="progress" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="progress" className="text-brand-700">
              Progress
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-brand-700">
              Question History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
              <CardHeader className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleLimitChange} defaultValue="15">
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Questions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Last 5</SelectItem>
                        <SelectItem value="10">Last 10</SelectItem>
                        <SelectItem value="15">Last 15</SelectItem>
                        <SelectItem value="20">Last 20</SelectItem>
                        <SelectItem value="25">Last 25</SelectItem>
                        <SelectItem value="30">Last 30</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {showCustomLimit && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Number"
                          className="w-[80px]"
                          value={customLimit}
                          onChange={handleCustomLimitChange}
                          min="1"
                        />
                        <Button size="sm" onClick={applyCustomLimit}>Apply</Button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                <CardTitle className="text-xl text-brand-800">Score Trend</CardTitle>
                  <CardDescription>Your scores for the last {questionLimit} practice questions</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {scoreData && scoreData.length > 0 ? (
                    <Line data={scoreTrendChartData} options={scoreTrendOptions} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <FileBarChart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No data yet</p>
                      <p className="text-sm text-muted-foreground/70 text-center max-w-md mt-2">
                        Practice more interview questions to see your score trend over time.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-brand-800">Performance Breakdown</CardTitle>
                  <CardDescription>Your average scores by interview component (last 10 questions)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {categoryData && categoryData.length > 0 ? (
                      <Bar data={categoryChartData} options={categoryChartOptions} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <FileBarChart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No data yet</p>
                        <p className="text-sm text-muted-foreground/70 text-center max-w-md mt-2">
                          Practice more to see your performance breakdown by component.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-brand-800">Practice Frequency</CardTitle>
                  <CardDescription>Number of practice questions per day (last 7 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {practiceFrequency && practiceFrequency.length > 0 ? (
                      <Bar data={frequencyChartData} options={frequencyChartOptions} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <FileBarChart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No data yet</p>
                        <p className="text-sm text-muted-foreground/70 text-center max-w-md mt-2">
                          Complete more practice sessions to see your practice frequency.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md md:col-span-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-brand-800">Practice History</CardTitle>
                  <CardDescription>Questions you've practiced</CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      className="pl-10 bg-white/80 backdrop-blur-sm border-brand-200 focus-visible:ring-brand-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                  <ScrollArea className="h-full">
                    <div className="px-4 py-2">
                      {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((question) => (
                          <div
                            key={question.id}
                            className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                              selectedQuestion === question.id
                                ? "bg-brand-100 border border-brand-200"
                                : "hover:bg-brand-50"
                            }`}
                            onClick={() => setSelectedQuestion(question.id)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="font-medium text-brand-800 line-clamp-2">{question.text}</h3>
                              <Badge
                                variant={
                                  Math.round(question.lastScore) >= 80
                                    ? "success"
                                    : Math.round(question.lastScore) >= 60
                                      ? "warning"
                                      : "destructive"
                                }
                              >
                                {Math.round(question.lastScore)}
                              </Badge>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{question.category}</span>
                              <span>{question.attempts} attempts</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-muted-foreground">No questions found</p>
                          {userQuestions.length === 0 && !isLoading && (
                            <Link href="/practice">
                              <Button className="mt-4 bg-brand-600 hover:bg-brand-700" size="sm">
                                Start Practicing
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                      <div className="h-4"></div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md md:col-span-2">
                {selectedQuestion && questionDetails ? (
                  <>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl text-brand-800">{questionDetails?.text}</CardTitle>
                          <CardDescription>
                            {questionDetails?.category} • {questionDetails?.attempts} attempts
                          </CardDescription>
                        </div>
                        <Link href={`/practice/record?question=${encodeURIComponent(questionDetails?.text || "")}`}>
                          <Button size="sm" className="bg-brand-600 hover:bg-brand-700">
                            Practice Again
                            <ArrowUpRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-brand-800 mb-3">Score History</h3>
                        <div className="h-[200px]">
                          {questionDetails?.scoreHistory && questionDetails.scoreHistory.length > 0 ? (
                            <Line data={questionScoreChartData as ChartData<'line'>} options={questionScoreChartOptions} />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                              <FileBarChart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                              <p className="text-base font-medium text-muted-foreground">No score history yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-brand-800">Attempt History</h3>
                          <p className="text-sm text-muted-foreground">
                            Select an attempt to see detailed feedback
                          </p>
                        </div>
                        
                        <div className="grid gap-4 mb-6">
                          <ScrollArea className="h-[120px] border rounded-md p-2">
                            <div className="flex gap-2 p-1">
                          {questionDetails?.feedback && questionDetails.feedback.length > 0 ? (
                            questionDetails.feedback.map((feedback, index) => (
                                  <div
                                    key={index}
                                    onClick={() => handleAttemptSelect(index)}
                                    className={`min-w-[100px] p-3 border rounded-md cursor-pointer transition ${
                                      selectedAttempt === index
                                        ? "bg-brand-100 border-brand-300"
                                        : "bg-white hover:bg-gray-50"
                                    }`}
                                  >
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(feedback.date).toLocaleDateString()}
                                    </p>
                                    <p className="text-lg font-semibold text-brand-800">
                                      {Math.round(feedback.score)}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center w-full">
                                  <p className="text-muted-foreground">No practice history available</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                        
                        {attemptDetails && (
                          <div className="space-y-6">
                            <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-xl text-brand-800">Performance Score</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-2">
                                  <div className="relative w-32 h-32 mx-auto mb-4">
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
                                        strokeDashoffset={352.56 - (352.56 * Math.round(attemptDetails.scores?.overall ?? attemptDetails.score ?? 0) / 100)}
                                      />
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-brand-800">
                                      {Math.round(attemptDetails.scores?.overall ?? attemptDetails.score ?? 0)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Content</p>
                                    <p className="text-lg font-medium text-brand-800">{Math.round(attemptDetails.scores?.content ?? 0)}/100</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Structure</p>
                                    <p className="text-lg font-medium text-brand-800">{Math.round(attemptDetails.scores?.structure ?? 0)}/100</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Delivery</p>
                                    <p className="text-lg font-medium text-brand-800">{Math.round(attemptDetails.scores?.delivery ?? 0)}/100</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Confidence</p>
                                    <p className="text-lg font-medium text-brand-800">{Math.round(attemptDetails.scores?.confidence ?? 0)}/100</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Tabs defaultValue="feedback" className="mb-8">
                              <TabsList className="flex w-full mb-4">
                                <TabsTrigger className="flex-1 text-brand-700" value="feedback">Detailed Feedback</TabsTrigger>
                                <TabsTrigger className="flex-1 text-brand-700" value="metrics">Speech Metrics</TabsTrigger>
                                <TabsTrigger className="flex-1 text-brand-700" value="body">Body Language</TabsTrigger>
                                <TabsTrigger className="flex-1 text-brand-700" value="transcript">Transcript</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="feedback" className="animate-in">
                                <div className="space-y-6">
                                  <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md mb-6">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center">
                                        <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                                        <CardTitle className="text-lg text-brand-800">Strengths</CardTitle>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-brand-700">{attemptDetails.strengths}</p>
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
                                      <p className="text-brand-700">{attemptDetails.improvements}</p>
                                    </CardContent>
                                  </Card>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="metrics" className="animate-in">
                                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                                  <CardContent className="pt-6">
                                    <div className="space-y-6">
                                      {attemptDetails.speech_metrics && (
                                        <>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-medium text-brand-700">Speaking Rate</span>
                                              <Badge variant="outline" className="text-brand-700">
                                                {attemptDetails.speech_metrics?.speaking_rate || 0} words/min
                                              </Badge>
                                            </div>
                                            <Progress 
                                              value={Math.min(100, (attemptDetails.speech_metrics?.speaking_rate || 0) / 2)} 
                                              className="h-2" 
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {attemptDetails.speech_metrics?.pace_analysis || 
                                                (attemptDetails.speech_metrics?.speaking_rate > 160 
                                                  ? "Your pace is slightly fast. Try to slow down a bit." 
                                                  : attemptDetails.speech_metrics?.speaking_rate < 120
                                                  ? "Your pace is slightly slow. Try to speak a bit faster."
                                                  : "Your speaking pace is good for interview settings.")}
                                            </p>
                                          </div>
                                          
                                          {attemptDetails.speech_metrics?.filler_words && (
                                            <div className="border-t border-gray-100 pt-4">
                                              <div className="text-sm font-medium text-brand-700 mb-3">Filler Words</div>
                                              <div className="bg-gray-50 rounded-md p-3">
                                                <div className="flex justify-between mb-2">
                                                  <span className="text-sm text-muted-foreground">Total filler words used:</span>
                                                  <Badge variant={
                                                    (attemptDetails.speech_metrics?.filler_words?.total === 0) ? "success" : 
                                                    (attemptDetails.speech_metrics?.filler_words?.total || 0) < 5 ? "outline" : "destructive"
                                                  }>
                                                    {attemptDetails.speech_metrics?.filler_words?.total || 0}
                                                  </Badge>
                                                </div>
                                                
                                                {attemptDetails.speech_metrics?.filler_words?.details && 
                                                 Object.keys(attemptDetails.speech_metrics.filler_words.details).length > 0 && (
                                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {Object.entries(attemptDetails.speech_metrics.filler_words.details).map(([word, count]) => (
                                                      <div key={word} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                                        <span className="text-sm font-mono">"{word}"</span>
                                                        <Badge variant="secondary">{count as number}×</Badge>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                                
                                                {(attemptDetails.speech_metrics?.filler_words?.total || 0) > 0 ? (
                                                  <p className="text-xs text-amber-600 mt-2">
                                                    Reducing filler words can make your responses sound more confident and articulate.
                                                  </p>
                                                ) : (
                                                  <p className="text-xs text-green-600 mt-2">
                                                    Excellent! You used minimal or no filler words in your response.
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div className="border-t border-gray-100 pt-4">
                                            <div className="space-y-2">
                                              <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-brand-700">Vocabulary Diversity</span>
                                                <Badge variant="outline" className="text-brand-700">
                                                  {Math.round(attemptDetails.speech_metrics?.vocabulary_diversity || 0)}/100
                                                </Badge>
                                              </div>
                                              <Progress value={Math.round(attemptDetails.speech_metrics?.vocabulary_diversity || 0)} className="h-2" />
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {attemptDetails.speech_metrics?.vocabulary_analysis || 
                                                  ((attemptDetails.speech_metrics?.vocabulary_diversity || 0) > 75
                                                    ? "Your vocabulary is rich and diverse, which keeps your answer engaging."
                                                    : (attemptDetails.speech_metrics?.vocabulary_diversity || 0) < 50
                                                    ? "Consider using more varied vocabulary to make your answers more engaging."
                                                    : "Your vocabulary diversity is average for professional communication.")}
                                              </p>
                                            </div>
                                          </div>
                                          
                                          {attemptDetails.speech_metrics?.answer_completeness && (
                                            <div className="border-t border-gray-100 pt-4">
                                              <div className="space-y-2">
                                                <span className="text-sm font-medium text-brand-700">Answer Completeness</span>
                                                <div className="flex items-center mt-2">
                                    <Badge
                                                    className={`${
                                                      attemptDetails.speech_metrics.answer_completeness === "Complete" 
                                                        ? "bg-green-100 text-green-800" 
                                                        : attemptDetails.speech_metrics.answer_completeness === "Mostly complete" 
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                    >
                                                    {attemptDetails.speech_metrics.answer_completeness || "Not analyzed"}
                                    </Badge>
                                  </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                  {attemptDetails.speech_metrics?.completeness_details || 
                                                    (attemptDetails.speech_metrics?.answer_completeness === "Complete"
                                                      ? "Your answer thoroughly addressed all aspects of the question."
                                                      : attemptDetails.speech_metrics?.answer_completeness === "Mostly complete"
                                                      ? "Your answer covered most aspects of the question, but might be missing some details."
                                                      : "Your answer missed important aspects of the question.")}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                              
                              <TabsContent value="body" className="animate-in">
                                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                                  <CardHeader>
                                    <CardTitle className="text-xl text-brand-800">Body Language Analysis</CardTitle>
                                    <CardDescription>Visual analysis of your posture, eye contact and movement</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                      {/* Posture section */}
                                      {attemptDetails.body_language?.posture && (
                                        <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center">
                                              <Monitor className="h-5 w-5 text-brand-600 mr-2" />
                                              <h3 className="text-base font-medium text-brand-800">Posture</h3>
                                    </div>
                                            <span className="text-base font-semibold text-brand-700">
                                              {Math.round(attemptDetails.body_language.posture.score || 0)}/100
                                            </span>
                                    </div>
                                          <Progress value={Math.round(attemptDetails.body_language.posture.score || 0)} className="h-2.5 mb-3" />
                                          <p className="text-sm text-muted-foreground">
                                            {attemptDetails.body_language.posture.evaluation || "Posture analysis unavailable"}
                                          </p>
                                        </div>
                                      )}

                                      {/* Eye Contact section */}
                                      {attemptDetails.body_language?.eye_contact && (
                                        <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center">
                                              <Eye className="h-5 w-5 text-brand-600 mr-2" />
                                              <h3 className="text-base font-medium text-brand-800">Eye Contact</h3>
                                            </div>
                                            <span className="text-base font-semibold text-brand-700">
                                              {Math.round(attemptDetails.body_language.eye_contact.score || 0)}/100
                                            </span>
                                          </div>
                                          <Progress value={Math.round(attemptDetails.body_language.eye_contact.score || 0)} className="h-2.5 mb-3" />
                                          <p className="text-sm text-muted-foreground">
                                            {attemptDetails.body_language.eye_contact.score === 0 
                                              ? "Eye contact detection requires clear facial visibility. Try recording with better lighting and facing the camera directly."
                                              : attemptDetails.body_language.eye_contact.evaluation || "Eye contact analysis unavailable"}
                                          </p>
                                        </div>
                                      )}

                                      {/* Movement section */}
                                      {attemptDetails.body_language?.movement && (
                                        <div className="bg-white rounded-lg p-4 border border-brand-100 shadow-sm">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center">
                                              <Activity className="h-5 w-5 text-brand-600 mr-2" />
                                              <h3 className="text-base font-medium text-brand-800">Movement Control</h3>
                                            </div>
                                            <span className="text-base font-semibold text-brand-700">
                                              {Math.round(attemptDetails.body_language.movement.score || 0)}/100
                                            </span>
                                          </div>
                                          <Progress value={Math.round(attemptDetails.body_language.movement.score || 0)} className="h-2.5 mb-3" />
                                          <p className="text-sm text-muted-foreground">
                                            {attemptDetails.body_language.movement.evaluation || "Movement analysis unavailable"}
                                          </p>
                                        </div>
                                      )}
                                  </div>
                                </CardContent>
                              </Card>
                              </TabsContent>
                              
                              <TabsContent value="transcript" className="animate-in">
                                <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                                  <CardContent className="pt-6">
                                    {attemptDetails.raw_transcript && attemptDetails.raw_transcript !== attemptDetails.transcript && (
                                      <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                          <h3 className="text-sm font-semibold text-brand-700">Enhanced Transcript</h3>
                                          <Badge variant="secondary" className="text-xs">AI-Enhanced</Badge>
                                        </div>
                                        <div className="whitespace-pre-wrap rounded-md border p-4 bg-white">
                                          {attemptDetails.transcript || 'No transcript available'}
                                        </div>
                                        
                                        <div className="mt-6 mb-2">
                                          <h3 className="text-sm font-semibold text-brand-700">Raw Transcript</h3>
                                        </div>
                                        <div className="whitespace-pre-wrap rounded-md border p-4 bg-gray-50 text-gray-700">
                                          {attemptDetails.raw_transcript || 'No raw transcript available'}
                                        </div>
                            </div>
                          )}
                                    
                                    {(!attemptDetails.raw_transcript || attemptDetails.raw_transcript === attemptDetails.transcript) && (
                                      <div className="whitespace-pre-wrap rounded-md border p-4 bg-white mb-2">
                                        {attemptDetails.transcript || 'No transcript available'}
                        </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center p-6">
                    <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                      <Search className="h-6 w-6 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-medium text-brand-800 mb-2">Select a question</h3>
                    <p className="text-muted-foreground max-w-md">
                      {isLoading
                        ? "Loading your practice history..."
                        : userQuestions.length === 0
                        ? "No practice history found. Start practicing to see your progress."
                        : "Select a question from the list to view detailed feedback and performance."}
                    </p>
                    {userQuestions.length === 0 && !isLoading && (
                      <Link href="/practice">
                        <Button className="mt-4 bg-brand-600 hover:bg-brand-700">
                          Start Practicing
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
