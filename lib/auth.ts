import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "./firebase"

export async function signInAnonymous(): Promise<User> {
  const result = await signInAnonymously(auth)
  return result.user
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
