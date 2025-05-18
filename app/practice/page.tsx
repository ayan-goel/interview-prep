"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react"
import { interviewQuestions } from "@/lib/questions"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function PracticePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { user } = useAuth()

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

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions or categories..."
              className="pl-10 bg-white/80 backdrop-blur-sm border-brand-200 focus-visible:ring-brand-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-brand-200 text-brand-700">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredQuestions.map((question, index) => (
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
                    {/* Mock data - in a real app, this would come from user's practice history */}
                    <div className="text-xs text-muted-foreground">{Math.floor(Math.random() * 5)} attempts</div>

                    {Math.random() > 0.3 && (
                      <Badge variant={Math.random() > 0.5 ? "success" : "warning"}>
                        {Math.floor(Math.random() * 30) + 70}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
