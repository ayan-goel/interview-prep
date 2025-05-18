"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase, type User as SupabaseUser, type Session } from "@/lib/supabase"

// Extended user type that includes the name which we might store in user metadata
interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Convert Supabase user to our User interface
  const formatUser = (supabaseUser: SupabaseUser | null, name?: string): User | null => {
    if (!supabaseUser) return null
    
    return {
      id: supabaseUser.id,
      name: name || supabaseUser.user_metadata?.name || 'User',
      email: supabaseUser.email || '',
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const currentUser = formatUser(session.user)
          setUser(currentUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const currentUser = formatUser(session.user)
        setUser(currentUser)
    }
    setLoading(false)
    }

    initializeAuth()

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      throw new Error(error.message)
    }
  }

  const signUp = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: {
        data: { name }
      }
    })
    
    if (error) {
      throw new Error(error.message)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  return <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>{!loading && children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
