import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
}

/** False until the NEXT_PUBLIC_FIREBASE_* variables are filled in (see .env.example). */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) throw new Error('Firebase no está configurado')
  return getApps().length ? getApp() : initializeApp(config)
}
