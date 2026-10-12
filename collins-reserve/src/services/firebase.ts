import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import type { Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

function assertConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missing.join(', ')}. Copy .env.example to .env and fill in your Firebase web app config.`,
    )
  }
}

let app: FirebaseApp
let db: Firestore
let authModule: Promise<typeof import('firebase/auth')> | null = null
let auth: Auth | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    assertConfig()
    app = getApps()[0] ?? initializeApp(firebaseConfig)
  }
  return app
}

/**
 * Loads the Firebase Auth SDK on demand (~50 kB gzip) so public pages
 * don't pay for it on first paint. Resolves to the same module after the
 * first call; use the synchronous getFirebaseAuth() once this has resolved.
 */
export function loadAuth(): Promise<typeof import('firebase/auth')> {
  if (!authModule) {
    authModule = import('firebase/auth').then((mod) => {
      auth = mod.getAuth(getFirebaseApp())
      return mod
    })
  }
  return authModule
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase Auth not loaded yet — await loadAuth() first')
  return auth
}

export function getDb(): Firestore {
  if (!db) {
    db = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Auto long-polling avoids the WebChannel transport drops seen on
      // restrictive networks (keeps realtime orders/reservations alive).
      experimentalAutoDetectLongPolling: true,
    })
  }
  return db
}
