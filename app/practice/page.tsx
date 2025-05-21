"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Search, Filter, Users, BookOpen } from "lucide-react"
import { interviewQuestions } from "@/lib/questions"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserPracticeHistory } from "@/lib/api-service"

export default function PracticePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [practiceHistory, setPracticeHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  // Fetch user's practice history
  useEffect(() => {
    const loadPracticeHistory = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const history = await getUserPracticeHistory(user.id);
        setPracticeHistory(history);
      } catch (error) {
        console.error("Error loading practice history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPracticeHistory();
  }, [user]);

  // Process practice data for each question
  const getQuestionData = (questionText: string) => {
    if (!practiceHistory || practiceHistory.length === 0) {
      return { attempts: 0, lastScore: null };
    }
    
    // Find all practice sessions for this question
    const sessions = practiceHistory.filter(
      session => session.questions?.text === questionText
    );
    
    if (sessions.length === 0) {
      return { attempts: 0, lastScore: null };
    }
    
    // Sort by date (newest first)
    sessions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Return attempts count and most recent score
    return {
      attempts: sessions.length,
      lastScore: sessions[0].overall_score
    };
  };

  // Redirect if not authenticated
  if (!user) {
    router.push("/signin")
    return null
  }

  const filteredQuestions = interviewQuestions.filter(
    (question) =>
      question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      question.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight gradient-text">Practice Interview</h1>
          <p className="mt-2 text-muted-foreground">Select a question to practice and record your response.</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md mb-8 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="p-6 md:p-8 flex-1">
              <h2 className="text-2xl font-bold text-brand-800 mb-3">Mock Interview</h2>
              <p className="text-brand-700 mb-4 text-lg">
                Practice a complete interview with multiple questions back-to-back
              </p>
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-brand-600" />
                  </div>
                  <span className="text-brand-700">Simulates a real interview environment</span>
                </div>
                
                <div className="mt-8 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-brand-600" />
                  </div>
                  <span className="text-brand-700">Comprehensive performance report</span>
                </div>
              </div>
              <Link href="/practice/mock">
                <Button size="lg" className="bg-brand-600 hover:bg-brand-700">
                  Start Mock Interview
                </Button>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-brand-100 to-brand-50 p-6 md:p-8 flex-none md:w-1/3 flex flex-col justify-center items-center md:border-l border-brand-200">
              <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"></path>
                  <path d="M16 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8"></path>
                  <path d="M9 18c.866-1.333 2.599-4 2.599-4M16 12l-7 6"></path>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-brand-800 font-semibold mb-1">Choose your questions</p>
                <p className="text-sm text-brand-600">Random or specific selections</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions or categories..."
              className="pl-10 bg-white/80 backdrop-blur-sm border-brand-200 focus-visible:ring-brand-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredQuestions.map((question, index) => {
            const questionData = getQuestionData(question.text);
            
            return (
              <Card
                key={index}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-brand-100"
                onClick={() => router.push(`/practice/record?question=${encodeURIComponent(question.text)}`)}
              >
                <CardContent className="p-4">
                  <p className="text-brand-900 font-medium mb-4 min-h-[60px]">{question.text}</p>

                  <div className="flex items-center justify-between mt-auto">
                    <Button
                      variant="ghost"
                      className="text-brand-600 hover:text-brand-700 hover:bg-brand-100 px-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/practice/record?question=${encodeURIComponent(question.text)}`)
                      }}
                    >
                      Practice This Question
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground">
                        {questionData.attempts} attempts
                      </div>

                      {questionData.lastScore !== null && (
                        <Badge 
                          variant={
                            questionData.lastScore >= 80 
                              ? "success" 
                              : questionData.lastScore >= 60 
                                ? "warning" 
                                : "destructive"
                          }
                        >
                          {Math.round(questionData.lastScore)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  )
}
