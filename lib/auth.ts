import { firebaseConfigured, getFirebaseApp } from './firebase'

export type AuthErrorCode = 'not-configured' | 'not-admin' | 'cancelled' | 'failed'

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message)
  }
}

/** Google account allowed to sign in as the administrator. */
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase()

/* ------------------------------- Sesión -------------------------------- */
/* Los miembros entran con PIN (sin cuenta de Google), pero las reglas de Firestore exigen
   una sesión. Cada dispositivo abre una sesión anónima y la reutiliza. */

let pendingSession: Promise<void> | null = null

async function openSession(): Promise<void> {
  const { getAuth, signInAnonymously } = await import('firebase/auth')
  const auth = getAuth(getFirebaseApp())
  await auth.authStateReady()
  if (!auth.currentUser) await signInAnonymously(auth)
}

/** Garantiza que haya una sesión de Firebase (Google o anónima). No hace nada sin Firebase. */
export function ensureSession(): Promise<void> {
  if (!firebaseConfigured) return Promise.resolve()
  if (!pendingSession) pendingSession = openSession().finally(() => { pendingSession = null })
  return pendingSession
}

/* ----------------------------- PIN storage ----------------------------- */
/* With Firebase configured the hash lives in Firestore (users/{id}.pinHash);
   otherwise it falls back to this browser's localStorage so the app still runs. */

const localKey = (memberId: string) => `casa-peralta:pin:${memberId}`

export async function hashPin(memberId: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`casa-peralta:${memberId}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readPinHash(memberId: string): Promise<string | null> {
  if (!firebaseConfigured) {
    try {
      return localStorage.getItem(localKey(memberId))
    } catch {
      return null
    }
  }
  await ensureSession()
  const { doc, getDoc, getFirestore } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(getFirestore(getFirebaseApp()), 'users', memberId))
  const value = snapshot.exists() ? snapshot.data().pinHash : null
  return typeof value === 'string' ? value : null
}

export async function hasPin(memberId: string): Promise<boolean> {
  return (await readPinHash(memberId)) !== null
}

export async function savePin(memberId: string, pin: string): Promise<void> {
  const pinHash = await hashPin(memberId, pin)
  if (!firebaseConfigured) {
    localStorage.setItem(localKey(memberId), pinHash)
    return
  }
  await ensureSession()
  const { doc, getFirestore, serverTimestamp, setDoc } = await import('firebase/firestore')
  await setDoc(doc(getFirestore(getFirebaseApp()), 'users', memberId), { pinHash, pinUpdatedAt: serverTimestamp() }, { merge: true })
}

export async function checkPin(memberId: string, pin: string): Promise<boolean> {
  const stored = await readPinHash(memberId)
  return stored !== null && stored === (await hashPin(memberId, pin))
}

/* ----------------------------- Google (admin) ----------------------------- */

export async function signInAdminWithGoogle(): Promise<{ email: string }> {
  if (!firebaseConfigured) {
    throw new AuthError('not-configured', 'Falta configurar Firebase (copia .env.example a .env.local).')
  }
  const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import('firebase/auth')
  const auth = getAuth(getFirebaseApp())

  let email = ''
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    email = (result.user.email ?? '').toLowerCase()
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new AuthError('cancelled', 'Inicio de sesión cancelado.')
    }
    throw new AuthError('failed', 'No se pudo iniciar sesión con Google.')
  }

  if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
    await signOut(auth)
    throw new AuthError('not-admin', 'Esta cuenta de Google no es la de la administradora.')
  }
  return { email }
}

export async function signOutAdmin(): Promise<void> {
  if (!firebaseConfigured) return
  const { getAuth, signOut } = await import('firebase/auth')
  await signOut(getAuth(getFirebaseApp()))
}
