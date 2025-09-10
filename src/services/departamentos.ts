// services/departamentos.ts
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  orderBy,
} from "firebase/firestore";

export type Departamento = {
  id?: string;
  nome?: string;
  colaboradoresCount?: number;
};

/** Lista departamentos (ordenados por nome) */
export async function listarDepartamentos(): Promise<Departamento[]> {
  const q = query(collection(db, "departamentos"), orderBy("nome"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** Cria e já inicia o contador em 0. Retorna o ID criado. */
export async function criarDepartamento(nome: string): Promise<string> {
  const ref = await addDoc(collection(db, "departamentos"), {
    nome,
    colaboradoresCount: 0,
  });
  return ref.id;
}

/** Atualiza apenas o nome (não mexe no contador). */
export async function atualizarDepartamento(id: string, nome: string) {
  await updateDoc(doc(db, "departamentos", id), { nome });
}

/**
 * Exclui o departamento.
 * ⚠️ As regras do Firestore só permitem se colaboradoresCount === 0.
 * Se houver vínculos, a operação será bloqueada (e você verá PERMISSION_DENIED).
 */
export async function excluirDepartamento(id: string) {
  await deleteDoc(doc(db, "departamentos", id));
}

/** Ajusta o contador de colaboradores (+1 / -1) de um departamento. */
export async function incColaboradores(depId: string, delta: number) {
  await updateDoc(doc(db, "departamentos", depId), {
    colaboradoresCount: increment(delta),
  });
}
