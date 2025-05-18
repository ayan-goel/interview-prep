import { createClient } from '@supabase/supabase-js'

// These environment variables are set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client
let supabaseInstance: ReturnType<typeof createClient> | undefined

// Check for environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }
}

// Initialize Supabase only once and only in the browser
export const supabase = (() => {
  // If environment variables are missing, return a mock client in SSR
  if (typeof window === 'undefined') {
    // In SSR, if we're missing env vars, return a minimal mock to prevent crashes
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        auth: {
          signInWithPassword: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          signUp: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          signOut: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        }
      } as any
    }
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // In client, show a helpful error but return a mock to prevent crashes
      console.error('Supabase URL and Anon Key are required. Check your .env.local file.')
      return {
        auth: {
          signInWithPassword: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          signUp: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          signOut: () => Promise.resolve({ error: new Error('Supabase configuration missing') }),
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        }
      } as any
    }
    // Client-side - Create and cache the instance
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseInstance
})()

// Export types for use throughout the app
export type { User, Session } from '@supabase/supabase-js' 