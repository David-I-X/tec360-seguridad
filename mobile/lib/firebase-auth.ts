import {
  getAuth,
  signInWithPhoneNumber,
  getIdToken,
  type ConfirmationResult,
} from '@react-native-firebase/auth';

let confirmationResult: ConfirmationResult | null = null;

/**
 * Solicita el código OTP por SMS utilizando el SDK nativo modular de Firebase Authentication
 */
export async function sendMobileFirebaseOTP(
  phoneNumber: string
): Promise<ConfirmationResult> {
  const auth = getAuth();
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
  confirmationResult = confirmation;
  return confirmation;
}

/**
 * Retorna la sesión de confirmación activa
 */
export function getConfirmationResult(): ConfirmationResult | null {
  return confirmationResult;
}

/**
 * Valida el código OTP de 6 dígitos con Firebase y retorna el idToken de Google
 */
export async function confirmMobileFirebaseOTP(code: string): Promise<string> {
  if (!confirmationResult) {
    throw new Error('No hay una sesión de verificación activa. Por favor solicita un nuevo código.');
  }

  const userCredential = await confirmationResult.confirm(code);
  if (!userCredential || !userCredential.user) {
    throw new Error('No se pudo verificar el código con Firebase.');
  }

  const idToken = await getIdToken(userCredential.user);
  return idToken;
}
