import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseAuth, getDb, loadAuth } from '@/services/firebase'
import type { RestaurantUser } from '@/types'
import type { User } from 'firebase/auth'

interface AuthContextValue {
  user: User | null
  profile: RestaurantUser | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<RestaurantUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    void loadAuth().then(({ onAuthStateChanged }) => {
      if (cancelled) return
      unsub = onAuthStateChanged(
        getFirebaseAuth(),
        (next) => {
          setUser(next)
          if (!next) {
            setProfile(null)
            setLoading(false)
          }
        },
        () => setLoading(false),
      )
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      doc(getDb(), 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as RestaurantUser) : null)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === 'admin' || profile?.role === 'manager',
      signIn: async (email, password) => {
        const { signInWithEmailAndPassword } = await loadAuth()
        await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
      },
      signOut: async () => {
        const { signOut } = await loadAuth()
        await signOut(getFirebaseAuth())
      },
      sendPasswordReset: async (email) => {
        const { sendPasswordResetEmail } = await loadAuth()
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim())
      },
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
