"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Search, Filter, Check, RefreshCcw, AlertCircle } from "lucide-react"
import { interviewQuestions } from "@/lib/questions"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserPracticeHistory } from "@/lib/api-service"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function MockInterviewPage() {
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [questionCount, setQuestionCount] = useState("3")
  const [selectionMode, setSelectionMode] = useState("random")
  const [practiceHistory, setPracticeHistory] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
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

  // Get unique categories from questions
  const categories = ["all", ...Array.from(new Set(interviewQuestions.map(q => q.category)))];

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

  // Filter questions based on search query and category
  const filteredQuestions = interviewQuestions.filter((question) => {
    const matchesSearch = question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          question.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || question.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle question selection
  const toggleQuestionSelection = (questionText: string) => {
    if (selectedQuestions.includes(questionText)) {
      setSelectedQuestions(selectedQuestions.filter(q => q !== questionText));
    } else {
      setSelectedQuestions([...selectedQuestions, questionText]);
    }
  };

  // Select random questions
  const selectRandomQuestions = () => {
    const filteredPool = selectedCategory === "all" 
      ? interviewQuestions 
      : interviewQuestions.filter(q => q.category === selectedCategory);
    
    const count = parseInt(questionCount);
    const shuffled = [...filteredPool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    setSelectedQuestions(selected.map(q => q.text));
  };

  // Start the mock interview
  const startMockInterview = () => {
    let questionsForInterview;
    
    if (selectionMode === "random") {
      // For random mode, directly generate random questions
      const filteredPool = interviewQuestions;
      const count = parseInt(questionCount);
      const shuffled = [...filteredPool].sort(() => 0.5 - Math.random());
      questionsForInterview = shuffled.slice(0, Math.min(count, shuffled.length)).map(q => q.text);
    } else {
      // For manual mode, use selected questions
      questionsForInterview = selectedQuestions;
      
      // Ensure we have at least one question for manual mode
      if (questionsForInterview.length === 0) {
        alert("Please select at least one question for the interview.");
        return;
      }
    }
    
    // Store the selected questions in localStorage
    localStorage.setItem('mockInterviewQuestions', JSON.stringify(questionsForInterview));
    localStorage.setItem('mockInterviewCurrentIndex', '0');
    
    // Navigate to the preparation page first
    router.push(`/practice/mock/prepare`);
  };

  // Redirect if not authenticated
  if (!user) {
    router.push("/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-brand-50">
      <div className="container max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/practice"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Practice
          </Link>
          <div className="mt-4 mb-6">
            <h1 className="text-3xl font-bold tracking-tight gradient-text mb-2">Mock Interview Setup</h1>
            <p className="text-muted-foreground max-w-xl">Customize your interview experience by selecting questions and categories that match your preparation needs.</p>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-brand-100 to-transparent rounded-full mb-8"></div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-brand-50 to-white pb-4 border-b border-brand-100">
                <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5l0 14"></path>
                      <path d="M18 11l-6 -6"></path>
                      <path d="M6 11l6 -6"></path>
                    </svg>
                  </div>
                  Interview Settings
                </CardTitle>
                <CardDescription>Configure your mock interview</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="pt-2 space-y-3">
                  <Label className="text-sm font-medium text-brand-700">Question Selection</Label>
                  <RadioGroup 
                    value={selectionMode} 
                    onValueChange={(value) => {
                      setSelectionMode(value);
                      // Clear selected questions when switching to random mode
                      if (value === "random") {
                        setSelectedQuestions([]);
                      }
                    }} 
                    className="bg-brand-50/50 p-3 rounded-md border border-brand-100"
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <RadioGroupItem value="random" id="random" className="h-5 w-5" />
                      <Label htmlFor="random" className="font-medium">Random Questions</Label>
                    </div>
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="manual" id="manual" className="h-5 w-5" />
                      <Label htmlFor="manual" className="font-medium">Choose Specific Questions</Label>
                    </div>
                  </RadioGroup>
                </div>

                {selectionMode === "random" && (
                  <div className="space-y-3">
                    <Label htmlFor="questionCount" className="text-sm font-medium text-brand-700">Number of Questions</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger id="questionCount" className="border-brand-200 bg-white">
                        <SelectValue placeholder="Number of questions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Question</SelectItem>
                        <SelectItem value="2">2 Questions</SelectItem>
                        <SelectItem value="3">3 Questions</SelectItem>
                        <SelectItem value="5">5 Questions</SelectItem>
                        <SelectItem value="7">7 Questions</SelectItem>
                        <SelectItem value="10">10 Questions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectionMode === "manual" && selectedQuestions.length === 0 && (
                  <Button 
                    onClick={selectRandomQuestions} 
                    variant="outline" 
                    className="w-full border-brand-200 text-brand-700"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Generate Random Questions
                  </Button>
                )}
                
                <div className="space-y-4 pt-4">
                  {selectedQuestions.length > 0 && (
                    <div className="bg-brand-50/50 text-sm text-center py-2 px-3 rounded-md border border-brand-100 text-brand-700">
                      <span className="font-medium">{selectedQuestions.length}</span> questions selected for your interview
                    </div>
                  )}
                  
                  <Button 
                    onClick={startMockInterview} 
                    className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-base"
                  >
                    Start Mock Interview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {selectedQuestions.length > 0 && selectionMode === "manual" && (
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-brand-50 to-white pb-4 border-b border-brand-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                            <rect x="9" y="3" width="6" height="4" rx="2"></rect>
                            <path d="m9 14 2 2 4-4"></path>
                          </svg>
                        </div>
                        Selected Questions
                      </CardTitle>
                      <CardDescription>Questions for your mock interview</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-brand-50 text-brand-700 ml-2">
                      {selectedQuestions.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-0 divide-y divide-brand-100">
                      {selectedQuestions.map((question, index) => (
                        <div 
                          key={index} 
                          className="flex items-center p-4 hover:bg-brand-50/50 transition-colors"
                        >
                          <div className="min-w-[24px] h-6 w-6 flex items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="w-3"></div>
                          <div className="flex-1">
                            <p className="text-sm text-brand-800 font-medium">{question}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 h-7 w-7 p-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-brand-700 hover:bg-brand-100"
                            onClick={() => toggleQuestionSelection(question)}
                          >
                            <span className="sr-only">Remove</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-8">
            {selectionMode === "manual" && (
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-brand-50 to-white pb-4 border-b border-brand-100">
                  <div className="mb-4">
                    <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </div>
                      Question Bank
                    </CardTitle>
                    <CardDescription>Select questions for your mock interview</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions or categories..."
                      className="pl-10 bg-white border-brand-200 focus-visible:ring-brand-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-0 divide-y divide-brand-100">
                      {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((question, index) => {
                          const questionData = getQuestionData(question.text);
                          const isSelected = selectedQuestions.includes(question.text);
                          
                          return (
                            <div 
                              key={index} 
                              className={`flex items-center p-4 cursor-pointer transition-colors ${
                                isSelected ? "bg-brand-50 border-l-2 border-brand-500" : "hover:bg-brand-50/50 border-l-2 border-transparent"
                              }`}
                              onClick={() => toggleQuestionSelection(question.text)}
                            >
                              <div 
                                className="flex h-5 w-5 shrink-0 items-center justify-center mr-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleQuestionSelection(question.text);
                                }}
                              >
                                {isSelected ? (
                                  <div className="h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center ring-2 ring-offset-2 ring-offset-white ring-brand-500/30">
                                    <Check className="h-3 w-3 text-brand-50" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-brand-300 transition-colors hover:border-brand-400" />
                                )}
                              </div>
                              <div className="w-3"></div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <p className={`font-medium ${isSelected ? "text-brand-900" : "text-brand-800"}`}>{question.text}</p>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {questionData.attempts > 0 
                                    ? `${questionData.attempts} previous ${questionData.attempts === 1 ? 'attempt' : 'attempts'}`
                                    : 'No previous attempts'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-brand-300" />
                          </div>
                          <p className="text-brand-800 font-medium mb-2">No questions found</p>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Try adjusting your search query or category filter to find more questions
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            
            {selectionMode === "random" && (
              <Card className="bg-white/90 backdrop-blur-md border-brand-200 shadow-md overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-brand-50 to-white pb-4 border-b border-brand-100">
                  <CardTitle className="text-xl text-brand-800 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    Random Interview Mode
                  </CardTitle>
                  <CardDescription>Questions will be randomly selected and revealed during the interview</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-20 w-20 rounded-full bg-brand-50 flex items-center justify-center mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                        <path d="M16 21h5v-5"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-brand-800 mb-2">Random Question Mode</h3>
                    <p className="text-muted-foreground max-w-md mb-8">
                      Questions will be randomly selected based on your settings and revealed one by one during the interview.
                    </p>
                    <div className="bg-gradient-to-br from-brand-100/80 to-brand-50/70 rounded-xl p-6 max-w-md border border-brand-200 shadow-sm">
                      <h4 className="text-lg font-semibold text-brand-800 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Your interview will include:
                      </h4>
                      <ul className="space-y-4">
                        <li className="flex items-center bg-white/80 p-3 rounded-lg border border-brand-200">
                          <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center mr-3 flex-shrink-0">
                            <Check className="h-4 w-4 text-brand-600" />
                          </div>
                          <span className="font-medium text-brand-800">{questionCount} random {parseInt(questionCount) === 1 ? 'question' : 'questions'}</span>
                        </li>
                        <li className="flex items-center bg-white/80 p-3 rounded-lg border border-brand-200">
                          <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center mr-3 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="font-medium text-brand-800">Timed interview experience</span>
                        </li>
                        <li className="flex items-center bg-white/80 p-3 rounded-lg border border-brand-200">
                          <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center mr-3 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="font-medium text-brand-800">Comprehensive feedback for each response</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 