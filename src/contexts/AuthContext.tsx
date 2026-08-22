import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  fetchSiteMembership,
  signInWithPassword,
  signOut as signOutRequest,
  signUpWithPassword,
} from '@/services/authService'
import { createCustomerProfile, fetchCustomerProfile } from '@/services/customerService'
import { useSite } from '@/contexts/SiteContext'
import type { CustomerProfile, SiteMember, SiteRole } from '@/types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  membership: SiteMember | null
  customer: CustomerProfile | null
  role: SiteRole | null
  isSiteAdmin: boolean
  isCustomer: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<'session' | 'confirm'>
  completeProfile: (fullName: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
  refreshCustomer: () => Promise<void>
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { siteId, loading: siteLoading } = useSite()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [membership, setMembership] = useState<SiteMember | null>(null)
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const resolveIdentities = useCallback(
    async (nextUser: User | null) => {
      if (!nextUser || !siteId) {
        setMembership(null)
        setCustomer(null)
        return
      }

      const [nextMembership, nextCustomer] = await Promise.all([
        fetchSiteMembership(nextUser.id, siteId),
        fetchCustomerProfile(nextUser.id, siteId),
      ])
      setMembership(nextMembership)
      setCustomer(nextCustomer)
    },
    [siteId],
  )

  useEffect(() => {
    if (siteLoading) return

    let cancelled = false

    async function bootstrap() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      setSession(data.session)
      setUser(data.session?.user ?? null)

      try {
        await resolveIdentities(data.session?.user ?? null)
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      window.setTimeout(() => {
        void (async () => {
          try {
            await resolveIdentities(nextSession?.user ?? null)
            setAuthError(null)
          } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Unable to verify access.')
          } finally {
            setLoading(false)
          }
        })()
      }, 0)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [resolveIdentities, siteLoading])

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null)
    setLoading(true)
    try {
      await signInWithPassword(email, password)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.')
      setLoading(false)
      throw error
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
      if (!siteId) {
        throw new Error('This store is not ready yet.')
      }
      setAuthError(null)
      setLoading(true)
      try {
        const data = await signUpWithPassword(email, password)
        if (data.user && data.session) {
          const profile = await createCustomerProfile(siteId, data.user.id, fullName, phone)
          setCustomer(profile)
          return 'session'
        }
        return 'confirm'
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Unable to create an account.')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [siteId],
  )

  const completeProfile = useCallback(
    async (fullName: string, phone: string) => {
      if (!siteId || !user) {
        throw new Error('You must be signed in first.')
      }
      const profile = await createCustomerProfile(siteId, user.id, fullName, phone)
      setCustomer(profile)
    },
    [siteId, user],
  )

  const refreshCustomer = useCallback(async () => {
    if (!user || !siteId) {
      setCustomer(null)
      return
    }
    setCustomer(await fetchCustomerProfile(user.id, siteId))
  }, [user, siteId])

  const signOut = useCallback(async () => {
    await signOutRequest()
    setMembership(null)
    setCustomer(null)
    setAuthError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading: loading || siteLoading,
      membership,
      customer,
      role: membership?.role ?? null,
      isSiteAdmin: Boolean(membership),
      isCustomer: Boolean(customer),
      authError,
      signIn,
      signUp,
      completeProfile,
      signOut,
      refreshCustomer,
      clearAuthError: () => setAuthError(null),
    }),
    [
      user,
      session,
      loading,
      siteLoading,
      membership,
      customer,
      authError,
      signIn,
      signUp,
      completeProfile,
      signOut,
      refreshCustomer,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
