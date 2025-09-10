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
  /** colaborador com nível = gestor */
  gestorResponsavelId?: string | null;
  /**
   * opcional: caso queira manter uma lista materializada.
   * recomendação: derivar por query em "colaboradores".
   */
  colaboradoresIds?: string[];
};

/** Lista departamentos (ordenados por nome) */
export async function listarDepartamentos(): Promise<Departamento[]> {
  const qy = query(collection(db, "departamentos"), orderBy("nome"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Cria um departamento.
 * - Inicia colaboradoresCount em 0.
 * - Aceita extras opcionais (gestorResponsavelId, colaboradoresIds).
 * Retorna o ID criado.
 */
export async function criarDepartamento(
  nome: string,
  extras?: {
    gestorResponsavelId?: string | null;
    colaboradoresIds?: string[];
  }
): Promise<string> {
  // sanitiza extras para não gravar undefined
  const payloadExtras: Record<string, any> = {};
  if ("gestorResponsavelId" in (extras || {})) {
    payloadExtras.gestorResponsavelId =
      (extras as any).gestorResponsavelId ?? null;
  }
  if (Array.isArray(extras?.colaboradoresIds)) {
    payloadExtras.colaboradoresIds = extras?.colaboradoresIds;
  }

  const ref = await addDoc(collection(db, "departamentos"), {
    nome,
    colaboradoresCount: 0,
    ...payloadExtras,
  });
  return ref.id;
}

/** Atualiza apenas o nome (não mexe no contador). */
export async function atualizarDepartamento(id: string, nome: string) {
  await updateDoc(doc(db, "departamentos", id), { nome });
}

/**
 * Atualiza o gestor responsável do departamento.
 * Use `null` para remover.
 */
export async function atualizarGestorResponsavel(
  id: string,
  gestorId: string | null
) {
  await updateDoc(doc(db, "departamentos", id), {
    gestorResponsavelId: gestorId ?? null,
  });
}

/**
 * Atualiza campos arbitrários do departamento (patch seguro).
 * Ex.: atualizarCamposDepartamento(id, { nome: "Novo", colaboradoresIds: [...] })
 */
export async function atualizarCamposDepartamento(
  id: string,
  patch: Partial<Omit<Departamento, "id">>
) {
  const safe = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, "departamentos", id), safe);
}

/**
 * Exclui o departamento.
 * ⚠️ As regras do Firestore só permitem se colaboradoresCount === 0.
 * Se houver vínculos, a operação será bloqueada (PERMISSION_DENIED).
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
