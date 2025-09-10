// Serviço de autenticação com Firebase
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
// Garante que o app Firebase já foi inicializado em src/services/firebase
// (seu arquivo atual). Apenas importá-lo já inicializa.
import "@/services/firebase";

const auth = getAuth();

export type AuthUser = User | null;

export function subscribeAuth(cb: (user: AuthUser) => void) {
  return onAuthStateChanged(auth, (user) => cb(user));
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}
