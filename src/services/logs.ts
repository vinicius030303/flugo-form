// src/services/logs.ts
import { db } from "./firebase";
import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";

// Mantém o tipo original para compatibilidade interna, se existir em outros pontos
export type AppLog = {
  id?: string;
  action: string; // ex: "colaborador:create"
  actor?: { uid?: string | null; email?: string | null };
  entity?: { type?: string; id?: string; name?: string };
  payload?: any;
  ts?: any; // Firestore Timestamp
};

// Tipo usado pela tela Logs.tsx
export type LogEntry = {
  id: string;
  action: string;
  actor?: { uid?: string | null; email?: string | null };
  entity?: { type?: string; id?: string; name?: string };
  payload?: any;
  createdAt?: any; // alias para ts
  ts?: any;
};

/** Grava um evento de log. */
export async function logEvent(log: Omit<AppLog, "id" | "ts">): Promise<string> {
  const ref = await addDoc(collection(db, "logs"), {
    ...log,
    ts: serverTimestamp(),
  });
  return ref.id;
}

/** Lista os N logs mais recentes (default 50). */
export async function listRecentLogs(n = 50): Promise<LogEntry[]> {
  const q = query(collection(db, "logs"), orderBy("ts", "desc"), fbLimit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return { id: d.id, ...data, createdAt: data?.ts } as LogEntry;
  });
}

/** Observa em tempo real os N logs mais recentes (default 50). */
export function watchRecentLogs(
  n = 50,
  cb: (logs: LogEntry[]) => void
): Unsubscribe {
  const q = query(collection(db, "logs"), orderBy("ts", "desc"), fbLimit(n));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => {
      const data = d.data() as any;
      return { id: d.id, ...data, createdAt: data?.ts } as LogEntry;
    });
    cb(rows);
  });
}

/** Alias para compatibilidade com seu Logs.tsx */
export const streamRecentLogs = watchRecentLogs;
