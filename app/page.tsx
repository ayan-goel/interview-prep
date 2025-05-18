"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Video, CheckCircle, Award, UserPlus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-brand-50">
      <header className="border-b border-brand-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-bold gradient-text">InterviewPrep</h1>
          <nav className="ml-auto flex gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-brand-700 hover:text-brand-500 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/practice"
                  className="text-sm font-medium text-brand-700 hover:text-brand-500 transition-colors"
                >
                  Practice
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="text-sm font-medium text-brand-700 hover:text-brand-500 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-medium text-brand-700 hover:text-brand-500 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
          <div className="container grid items-center gap-6 px-4 py-16 md:py-24 lg:py-32 sm:px-6 lg:px-8 relative">
            <div className="mx-auto max-w-3xl text-center animate-in">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-accent1 to-brand-600 animate-gradient-x">
                Ace your next interview with confidence
              </h1>
              <p className="mt-6 text-xl text-muted-foreground md:text-2xl">
                Practice answering interview questions, record yourself, and improve your performance.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <Link href="/practice">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Start Practicing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Create Account
                      <UserPlus className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-brand-300 text-brand-700 hover:bg-brand-50"
                  onClick={() => {
                    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="container px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">Why InterviewPrep Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center mb-6">
                <Video className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-semibold text-brand-800">Practice with Real Questions</h3>
              <p className="mt-3 text-muted-foreground">
                Choose from hundreds of real interview questions across different industries and roles.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="h-12 w-12 rounded-full bg-accent1/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-accent1" />
              </div>
              <h3 className="text-xl font-semibold text-brand-800">Record Your Responses</h3>
              <p className="mt-3 text-muted-foreground">
                Record yourself answering questions to review your body language, tone, and delivery.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="h-12 w-12 rounded-full bg-highlight/10 flex items-center justify-center mb-6">
                <Award className="h-6 w-6 text-highlight" />
              </div>
              <h3 className="text-xl font-semibold text-brand-800">Get Better with Practice</h3>
              <p className="mt-3 text-muted-foreground">
                Track your progress over time and see how your interview skills improve with each session.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-8 bg-white">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} InterviewPrep. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-brand-600">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-brand-600">
                Privacy
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-brand-600">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
