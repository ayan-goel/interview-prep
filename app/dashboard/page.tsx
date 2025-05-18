"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Calendar, ArrowUpRight, Clock, BarChart3, Search, FileBarChart } from "lucide-react"
import {
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  BarChart,
} from "@/components/ui/chart"
import { mockPracticeHistory, mockQuestionHistory } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  // Redirect if not authenticated
  if (!user) {
    router.push("/signin")
    return null
  }

  // Calculate average score over time (last 30 days)
  const scoreData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))

    // Find entries for this date
    const entriesForDate = mockPracticeHistory.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate.toDateString() === date.toDateString()
    })

    // Calculate average score for this date
    const avgScore =
      entriesForDate.length > 0
        ? entriesForDate.reduce((sum, entry) => sum + entry.score, 0) / entriesForDate.length
        : null

    return {
      date: date.toISOString().split("T")[0],
      score: avgScore,
    }
  }).filter((item) => item.score !== null)

  // Calculate category performance
  const categoryData = [
    { name: "General", score: 85 },
    { name: "Behavioral", score: 72 },
    { name: "Technical", score: 68 },
    { name: "Leadership", score: 78 },
    { name: "Career Goals", score: 90 },
  ]

  // Calculate practice frequency
  const practiceFrequency = [
    { day: "Mon", count: 3 },
    { day: "Tue", count: 5 },
    { day: "Wed", count: 2 },
    { day: "Thu", count: 4 },
    { day: "Fri", count: 6 },
    { day: "Sat", count: 1 },
    { day: "Sun", count: 0 },
  ]

  // Filter questions based on search
  const filteredQuestions = mockQuestionHistory.filter(
    (question) =>
      question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get question details if selected
  const questionDetails = selectedQuestion ? mockQuestionHistory.find((q) => q.id === selectedQuestion) : null

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
              <CardTitle className="text-lg text-brand-800">Total Practice Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-brand-900">24</p>
                  <p className="text-sm text-muted-foreground">+3 this week</p>
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
                    78<span className="text-xl">/100</span>
                  </p>
                  <p className="text-sm text-green-600">↑ 4% improvement</p>
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
                    3.5<span className="text-xl">hrs</span>
                  </p>
                  <p className="text-sm text-muted-foreground">This month</p>
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
              <CardHeader>
                <CardTitle className="text-xl text-brand-800">Score Trend</CardTitle>
                <CardDescription>Your average score over the past 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {scoreData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => {
                            const d = new Date(date)
                            return `${d.getMonth() + 1}/${d.getDate()}`
                          }}
                        />
                        <YAxis domain={[0, 100]} />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const date = new Date(label)
                              const formattedDate = date.toLocaleDateString()
                              return (
                                <ChartTooltipContent>
                                  <div className="font-medium">{formattedDate}</div>
                                  <div className="text-[13px] text-muted-foreground">Score: {payload[0].value}</div>
                                </ChartTooltipContent>
                              )
                            }
                            return null
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#0ea5e9" }}
                          activeDot={{ r: 6, fill: "#0ea5e9" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
                  <CardTitle className="text-xl text-brand-800">Category Performance</CardTitle>
                  <CardDescription>Your average score by question category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent>
                                    <div className="font-medium">{label}</div>
                                    <div className="text-[13px] text-muted-foreground">Score: {payload[0].value}</div>
                                  </ChartTooltipContent>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <FileBarChart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No data yet</p>
                        <p className="text-sm text-muted-foreground/70 text-center max-w-md mt-2">
                          Practice questions from different categories to see your performance by category.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-brand-800">Practice Frequency</CardTitle>
                  <CardDescription>Number of practice sessions by day of week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {practiceFrequency.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={practiceFrequency} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <ChartTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent>
                                    <div className="font-medium">{label}</div>
                                    <div className="text-[13px] text-muted-foreground">
                                      Sessions: {payload[0].value}
                                    </div>
                                  </ChartTooltipContent>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
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
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md md:col-span-1">
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
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
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
                                  question.lastScore >= 80
                                    ? "success"
                                    : question.lastScore >= 60
                                      ? "warning"
                                      : "destructive"
                                }
                              >
                                {question.lastScore}
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
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md md:col-span-2">
                {selectedQuestion ? (
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
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={questionDetails.scoreHistory}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(date) => {
                                    const d = new Date(date)
                                    return `${d.getMonth() + 1}/${d.getDate()}`
                                  }}
                                />
                                <YAxis domain={[0, 100]} />
                                <ChartTooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      const date = new Date(label)
                                      const formattedDate = date.toLocaleDateString()
                                      return (
                                        <ChartTooltipContent>
                                          <div className="font-medium">{formattedDate}</div>
                                          <div className="text-[13px] text-muted-foreground">
                                            Score: {payload[0].value}
                                          </div>
                                        </ChartTooltipContent>
                                      )
                                    }
                                    return null
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="score"
                                  stroke="#0ea5e9"
                                  strokeWidth={2}
                                  dot={{ r: 4, fill: "#0ea5e9" }}
                                  activeDot={{ r: 6, fill: "#0ea5e9" }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                              <FileBarChart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                              <p className="text-base font-medium text-muted-foreground">No score history yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-brand-800 mb-3">Recent Feedback</h3>
                        <div className="space-y-4">
                          {questionDetails?.feedback && questionDetails.feedback.length > 0 ? (
                            questionDetails.feedback.map((feedback, index) => (
                              <Card key={index} className="bg-brand-50/50 border-brand-100">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between">
                                    <CardTitle className="text-sm text-brand-800">
                                      Attempt on {new Date(feedback.date).toLocaleDateString()}
                                    </CardTitle>
                                    <Badge
                                      variant={
                                        feedback.score >= 80
                                          ? "success"
                                          : feedback.score >= 60
                                            ? "warning"
                                            : "destructive"
                                      }
                                    >
                                      {feedback.score}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-brand-800">Strengths: </span>
                                      <span className="text-muted-foreground">{feedback.strengths}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-brand-800">Areas for improvement: </span>
                                      <span className="text-muted-foreground">{feedback.improvements}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <p className="text-muted-foreground">No feedback available yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center p-6">
                    <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                      <BarChart3 className="h-8 w-8 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-medium text-brand-800 mb-2">Select a question</h3>
                    <p className="text-muted-foreground max-w-md">
                      Choose a question from the list to view detailed performance metrics and feedback history.
                    </p>
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
