import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tec-360.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tec-360",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tec-360.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
}

// Inicialización segura de Firebase Client (solo en navegador)
let app: FirebaseApp | undefined
let auth: Auth | undefined

if (typeof window !== "undefined") {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
}

export { app, auth }

/**
 * Configura el verificador reCAPTCHA invisible para proteger el envío de SMS contra bots
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof window === "undefined" || !auth) {
    throw new Error("reCAPTCHA solo puede inicializarse en el navegador")
  }

  // Si ya existía un reCAPTCHA en window, lo limpiamos para evitar duplicados
  const existing = (window as any).recaptchaVerifier
  if (existing) {
    try {
      existing.clear()
    } catch (_) {}
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA resuelto automáticamente
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expiró, se requiere nueva verificación")
    },
  })

  ;(window as any).recaptchaVerifier = verifier
  return verifier
}

/**
 * Solicita el código OTP vía SMS mediante Firebase Authentication
 */
export async function sendFirebaseOTP(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error("Firebase Auth no está inicializado")
  }
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

/**
 * Valida el código de 6 dígitos ingresado por el usuario y obtiene el idToken de Google
 */
export async function confirmFirebaseOTP(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const userCredential = await confirmationResult.confirm(code)
  return userCredential.user.getIdToken()
}
