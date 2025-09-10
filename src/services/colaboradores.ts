// services/departamentos.ts
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  writeBatch,
} from "firebase/firestore";

export type Departamento = {
  id?: string;
  nome?: string;
  colaboradoresCount?: number; // agregado
};

// ------- CRUD básico -------
export async function listarDepartamentos(): Promise<Departamento[]> {
  const snap = await getDocs(collection(db, "departamentos"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function criarDepartamento(nome: string): Promise<string> {
  const ref = await addDoc(collection(db, "departamentos"), {
    nome,
    colaboradoresCount: 0,
  });
  return ref.id;
}

export async function atualizarDepartamento(id: string, nome: string) {
  await updateDoc(doc(db, "departamentos", id), { nome });
}

export async function excluirDepartamento(id: string) {
  // validações de vínculo são feitas na UI antes de chamar aqui
  await updateDoc(doc(db, "departamentos", id), {});
  const ref = doc(db, "departamentos", id);
  // Delete via batch para ficar uniforme com outras operações
  const batch = writeBatch(db);
  batch.delete(ref);
  await batch.commit();
}

// ------- Agregado -------
export async function incColaboradores(depId: string, delta: number) {
  await updateDoc(doc(db, "departamentos", depId), {
    colaboradoresCount: increment(delta),
  });
}

// ------- Tempo real -------
export function watchDepartamentos(
  cb: (departamentos: Departamento[]) => void
) {
  const qy = query(collection(db, "departamentos"));
  const unsub = onSnapshot(qy, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(data);
  });
  return unsub; // caller deve chamar para parar
}

// ------- Utilitários de consistência -------

// Normaliza string (para casar nomes desacentuados/caixa)
const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Encontra um depto pelo nome (normalizado)
export async function findDeptByName(name: string): Promise<Departamento | null> {
  const list = await listarDepartamentos();
  const n = norm(name);
  return list.find((d) => norm(d.nome || "") === n) ?? null;
}

// Reconta colaboradoresCount de TODOS os departamentos com base em colaboradores.departmentId
export async function recalcAllCounts() {
  const batch = writeBatch(db);

  // zera todo mundo primeiro
  const deps = await listarDepartamentos();
  for (const d of deps) {
    if (!d.id) continue;
    batch.update(doc(db, "departamentos", d.id), { colaboradoresCount: 0 });
  }

  // agrupa colaboradores por departmentId
  const colSnap = await getDocs(collection(db, "colaboradores"));
  const counts = new Map<string, number>();
  colSnap.forEach((cs) => {
    const c = cs.data() as any;
    const depId = c?.departmentId;
    if (!depId) return;
    counts.set(depId, (counts.get(depId) || 0) + 1);
  });

  // aplica agregados
  counts.forEach((count, depId) => {
    batch.update(doc(db, "departamentos", depId), {
      colaboradoresCount: count,
    });
  });

  await batch.commit();
}

// Backfill: para cada colaborador sem departmentId, tenta resolver pelo campo legado "departamento"
export async function backfillDepartmentIds(options?: { createIfMissing?: boolean }) {
  const createMissing = !!options?.createIfMissing;

  const snap = await getDocs(collection(db, "colaboradores"));
  const deps = await listarDepartamentos();
  const byName = new Map(deps.map((d) => [norm(d.nome || ""), d]));

  const batch = writeBatch(db);
  for (const d of snap.docs) {
    const c = d.data() as any;
    if (c.departmentId) continue;
    const legacyName = (c.departamento || "").trim();
    if (!legacyName) continue;

    let target = byName.get(norm(legacyName)) || null;

    // opcional: criar depto ausente automaticamente
    if (!target && createMissing) {
      const newId = await criarDepartamento(legacyName);
      target = { id: newId, nome: legacyName, colaboradoresCount: 0 };
      byName.set(norm(legacyName), target);
    }

    if (target?.id) {
      batch.update(doc(db, "colaboradores", d.id), {
        departmentId: target.id,
        departamento: target.nome, // mantém espelho para buscas
      });
      // contador será recalculado ao final
    }
  }
  await batch.commit();

  // Ajusta agregados após backfill
  await recalcAllCounts();
}

// Merge: move todos do source -> target e apaga o source
export async function mergeDepartamentos(sourceId: string, targetId: string) {
  if (sourceId === targetId) return;

  const batch = writeBatch(db);

  // Move colaboradores
  const colSnap = await getDocs(collection(db, "colaboradores"));
  let moved = 0;
  colSnap.forEach((cs) => {
    const c = cs.data() as any;
    if (c.departmentId === sourceId) {
      batch.update(cs.ref, { departmentId: targetId });
      moved++;
    }
  });

  // Ajusta contadores
  if (moved > 0) {
    batch.update(doc(db, "departamentos", targetId), {
      colaboradoresCount: increment(moved),
    });
    batch.update(doc(db, "departamentos", sourceId), {
      colaboradoresCount: increment(-moved),
    });
  }

  // Deleta o source
  batch.delete(doc(db, "departamentos", sourceId));

  await batch.commit();
}
