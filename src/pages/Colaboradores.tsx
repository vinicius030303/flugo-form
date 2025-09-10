import { useEffect, useMemo, useState } from "react";
import React from "react";
import { db } from "../services/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit as fbLimit,
  startAfter,
  increment,
  onSnapshot,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Avatar,
  Modal,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  IconButton,
  Tooltip,
  Stack,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  Divider,
  TableContainer,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { StepForm } from "../components/StepForm";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  listarDepartamentos,
  type Departamento as Dept,
} from "@/services/departamentos";

// ===== Tipos =====
type Genero = "male" | "female";
type Nivel = "junior" | "pleno" | "senior" | "gestor";

interface Colaborador {
  id?: string;
  nome?: string;
  email?: string;
  // compat legado
  departamento?: string; // nome antigo salvo no doc
  // relacionamento novo
  departmentId?: string; // id do doc em "departamentos"
  status?: string;
  avatar?: string;
  avatarLock?: boolean;
  genero?: Genero;
  // novos campos
  nivel?: Nivel;
  gestorResponsavelId?: string;
  salarioBase?: number;
}

type GestorLite = { id: string; nome?: string; email?: string };

// ===== Error Boundary local (evita tela branca) =====
class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("[Colaboradores] Erro capturado no boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Corrigi um erro ao renderizar a lista. Tente alterar o filtro novamente ou recarregar.
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ===== Helpers =====
function gerarAvatar(nome: string, genero?: Genero) {
  const gen = genero ?? "male";
  const seedUnica = encodeURIComponent(
    (nome || "user") + "-" + Math.random().toString(36).slice(2, 9)
  );
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seedUnica}&gender=${gen}&v=${Date.now()}`;
}

const PAGE_SIZE = 20;
const BATCH_SAFE_LIMIT = 450; // folga das 500 operações

export const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [orderByKey, setOrderByKey] =
    useState<"nome" | "email" | "departamento" | "nivel" | "genero" | "status">(
      "nome"
    );
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ativo" | "inativo">("");
  const [generoFilter, setGeneroFilter] = useState<"" | Genero>("");

  // loading/erro + paginação
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // tempo real
  const [realtime, setRealtime] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] =
    useState<Colaborador | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  // guardo o depto antigo para ajustar contador se trocar
  const [editData, setEditData] = useState<
    (Required<Pick<Colaborador, "id" | "nome" | "email" | "status">> & {
      genero: Genero;
      departmentId: string; // sempre editar por ID
      // novos campos
      nivel: Nivel;
      gestorResponsavelId: string;
      salarioBase: number;
      __prevDepartmentId?: string;
    }) | null
  >(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveDeptId, setMoveDeptId] = useState<string>(""); // alvo p/ mover selecionados

  // ========= Departamentos =========
  const [departamentos, setDepartamentos] = useState<Dept[]>([]);
  const deptMap = useMemo(() => {
    const m = new Map<string, string>();
    departamentos.forEach((d) => d.id && m.set(d.id, d.nome || ""));
    return m;
  }, [departamentos]);

  const carregarDepartamentos = async () => {
    try {
      const data = await listarDepartamentos();
      data.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
          sensitivity: "base",
        })
      );
      setDepartamentos(data);
    } catch (e) {
      console.error("Falha ao listar departamentos", e);
      setDepartamentos([]);
    }
  };

  // ========= Gestores =========
  const [gestores, setGestores] = useState<GestorLite[]>([]);
  const [loadingGestores, setLoadingGestores] = useState<boolean>(false);

  const carregarGestores = async () => {
    setLoadingGestores(true);
    try {
      const qGest = query(
        collection(db, "colaboradores"),
        where("nivel", "==", "gestor")
      );
      const snap = await getDocs(qGest);
      const list: GestorLite[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, nome: data?.nome || "", email: data?.email || "" };
      });
      list.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
          sensitivity: "base",
        })
      );
      setGestores(list);
    } catch (e) {
      console.error("Falha ao carregar gestores", e);
      setGestores([]);
    } finally {
      setLoadingGestores(false);
    }
  };

  // Nome exibido do departamento (respeita departmentId, com fallback ao campo antigo)
  const depName = (c: Colaborador) =>
    (c.departmentId && (deptMap.get(c.departmentId) || "")) ||
    c.departamento ||
    "—";

  // ========= Helpers =========
  const norm = (s: any) => {
    try {
      return String(s ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    } catch {
      // fallback duríssimo para jamais estourar em runtime
      return String(s ?? "").toLowerCase();
    }
  };

  const labelGenero = (g?: Genero) =>
    g === "male" ? "Masculino" : g === "female" ? "Feminino" : "—";

  const labelNivel = (n?: Nivel | string) =>
    n === "junior"
      ? "Júnior"
      : n === "pleno"
      ? "Pleno"
      : n === "senior"
      ? "Sênior"
      : n === "gestor"
      ? "Gestor"
      : "—";

  const nivelRank = (n?: Nivel | string) =>
    n === "junior" ? 0 : n === "pleno" ? 1 : n === "senior" ? 2 : n === "gestor" ? 3 : 4;

  const sanitize = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

  // ========= Paginação =========
  const buildBaseQuery = () =>
    query(collection(db, "colaboradores"), orderBy("nome"), fbLimit(PAGE_SIZE));

  const loadFirstPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(buildBaseQuery());

      const docs = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const colab = { id: docSnap.id, ...docSnap.data() } as Colaborador;
          if (!colab.avatar && colab.nome && !colab.avatarLock) {
            const novoAvatar = gerarAvatar(colab.nome, colab.genero);
            colab.avatar = novoAvatar;
            await updateDoc(doc(db, "colaboradores", colab.id!), {
              avatar: novoAvatar,
            });
          }
          return colab;
        })
      );

      setColaboradores(docs);
      setSelectedIds([]);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar colaboradores.");
      setColaboradores([]);
      setLastDoc(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || !lastDoc) return;
    setLoadingMore(true);
    setError(null);
    try {
      const qMore = query(
        collection(db, "colaboradores"),
        orderBy("nome"),
        startAfter(lastDoc),
        fbLimit(PAGE_SIZE)
      );
      const snap = await getDocs(qMore);

      const docs = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const colab = { id: docSnap.id, ...docSnap.data() } as Colaborador;
          if (!colab.avatar && colab.nome && !colab.avatarLock) {
            const novoAvatar = gerarAvatar(colab.nome, colab.genero);
            colab.avatar = novoAvatar;
            await updateDoc(doc(db, "colaboradores", colab.id!), {
              avatar: novoAvatar,
            });
          }
          return colab;
        })
      );

      setColaboradores((prev) => [...prev, ...docs]);
      setSelectedIds([]);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : lastDoc);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar mais colaboradores.");
    } finally {
      setLoadingMore(false);
    }
  };

  const resetAndReload = async () => {
    setColaboradores([]);
    setLastDoc(null);
    setHasMore(true);
    await loadFirstPage();
  };

  // ========= Init / Realtime =========
  useEffect(() => {
    carregarDepartamentos();
  }, []);

  useEffect(() => {
    if (!realtime) {
      // modo padrão paginado
      loadFirstPage();
      setListening(false);
      return;
    }

    // modo tempo real (sem paginação)
    setListening(true);
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "colaboradores"), orderBy("nome")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Colaborador[];
        setColaboradores(list);
        setSelectedIds([]);
        setHasMore(false);
        setLastDoc(null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Falha no listener em tempo real.");
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime]);

  // ========= Opções de departamento (docs + legados) =========
  type DeptOption = { id: string; nome: string; legacy?: boolean };

  const deptOptionsUnion: DeptOption[] = useMemo(() => {
    // nomes de docs (somente com id válido)
    const docOptions: DeptOption[] = departamentos
      .filter((d) => !!d.id)
      .map((d) => ({
        id: d.id as string,
        nome: d.nome || "",
      }));

    // coletar nomes legados dos colaboradores (que não batem com os docs)
    const docNamesNorm = new Set(docOptions.map((o) => norm(o.nome)));
    const legacyMap = new Map<string, string>(); // normName -> original name

    for (const c of colaboradores) {
      const legacyName = (c.departamento || "").trim();
      if (!legacyName) continue;
      const n = norm(legacyName);
      if (!docNamesNorm.has(n) && !legacyMap.has(n)) {
        legacyMap.set(n, legacyName);
      }
    }

    const legacyOptions: DeptOption[] = Array.from(legacyMap.values()).map(
      (nome) => ({
        id: `legacy:${nome}`,
        nome,
        legacy: true,
      })
    );

    const all = [...docOptions, ...legacyOptions];
    all.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    return all;
  }, [departamentos, colaboradores]);

  // 🔒 Reseta o filtro de depto se a opção atual deixar de existir (evita tela branca)
  useEffect(() => {
    const d = typeof dept === "string" ? dept : "";
    if (!d) return; // já está em "Todos"
    const isValid = deptOptionsUnion.some((o) => o.id === d);
    if (!isValid) setDept("");
  }, [dept, deptOptionsUnion]);

  // 🔧 Extra: ao mudar de departamento, limpo seleção para evitar qualquer inconsistência
  useEffect(() => {
    setSelectedIds([]); // não interfere em UX e previne edge cases
  }, [dept]);

  // ========= Filtro + Ordenação (client-side) =========
  const filtrados = useMemo(() => {
    try {
      const qn = norm(q);
      const safeDept = typeof dept === "string" ? dept : "";

      const filtered = colaboradores.filter((c) => {
        const nome = norm(c?.nome);
        const email = norm(c?.email);
        const shownDep = norm(depName(c));

        const matchesText =
          !qn || nome.includes(qn) || email.includes(qn) || shownDep.includes(qn);

        // filtro por dept (pode ser ID de doc OU legacy:<nome>)
        const matchesDept = (() => {
          if (!safeDept) return true; // "Todos"
          if (safeDept.startsWith("legacy:")) {
            const target = norm(safeDept.slice(7)); // nome legado
            return shownDep === target;
          }
          if (c?.departmentId && c.departmentId === safeDept) return true;
          const selName = deptMap.get(safeDept);
          if (selName) {
            return norm(c?.departamento || "") === norm(selName);
          }
          return false;
        })();

        const matchesStatus =
          !statusFilter || norm(c?.status) === norm(statusFilter);

        const matchesGenero = !generoFilter || (c?.genero || "") === generoFilter;

        return matchesText && matchesDept && matchesStatus && matchesGenero;
      });

      // ordenação (especial p/ "departamento", "genero" e "nivel")
      return filtered.sort((a, b) => {
        if (orderByKey === "departamento") {
          const av = norm(depName(a));
          const bv = norm(depName(b));
          const cmp = av.localeCompare(bv);
          return order === "asc" ? cmp : -cmp;
        }
        if (orderByKey === "genero") {
          const av = norm(labelGenero(a.genero));
          const bv = norm(labelGenero(b.genero));
          const cmp = av.localeCompare(bv);
          return order === "asc" ? cmp : -cmp;
        }
        if (orderByKey === "nivel") {
          const av = nivelRank(a.nivel);
          const bv = nivelRank(b.nivel);
          const cmp = av === bv ? 0 : av < bv ? -1 : 1;
          return order === "asc" ? cmp : -cmp;
        }
        const av = norm((a as any)[orderByKey]);
        const bv = norm((b as any)[orderByKey]);
        const cmp = av.localeCompare(bv);
        return order === "asc" ? cmp : -cmp;
      });
    } catch (e) {
      console.error("[Colaboradores] Falha ao filtrar/ordenar:", e);
      return [];
    }
  }, [
    colaboradores,
    q,
    dept,
    statusFilter,
    generoFilter,
    orderByKey,
    order,
    deptMap,
  ]);

  // 📊 Estatísticas (com base no resultado filtrado)
  const stats = useMemo(() => {
    const total = filtrados.length;
    let ativos = 0,
      inativos = 0,
      male = 0,
      female = 0;
    for (const c of filtrados) {
      if ((c.status || "").toLowerCase() === "ativo") ativos++;
      else if ((c.status || "").toLowerCase() === "inativo") inativos++;
      if (c.genero === "male") male++;
      else if (c.genero === "female") female++;
    }
    return { total, ativos, inativos, male, female };
  }, [filtrados]);

  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = async () => {
    setOpenCreate(false);
    if (!realtime) await resetAndReload();
  };

  const handleSort = (
    property: "nome" | "email" | "departamento" | "nivel" | "status" | "genero"
  ) => {
    if (orderByKey === property) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderByKey(property);
      setOrder("asc");
    }
  };

  const sortIcon = (property: string) => {
    if (orderByKey === property) {
      return order === "asc" ? (
        <ArrowUpwardIcon fontSize="small" />
      ) : (
        <ArrowDownwardIcon fontSize="small" />
      );
    }
    return <ArrowDownwardIcon fontSize="small" sx={{ opacity: 0.3 }} />;
  };

  // ===== Avatar modal
  const abrirModalAvatar = (colab: Colaborador) => {
    setColaboradorSelecionado(colab || null);
    setCustomAvatarUrl(colab?.avatar || "");
    setAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    setAvatarModalOpen(false);
    setColaboradorSelecionado(null);
    setCustomAvatarUrl("");
  };

  const salvarAvatar = async (novoAvatar: string) => {
    try {
      const id = colaboradorSelecionado?.id;
      if (!id) return;

      const uniqueUrl = novoAvatar
        ? novoAvatar.includes("?")
          ? `${novoAvatar}&v=${Date.now()}`
          : `${novoAvatar}?v=${Date.now()}`
        : novoAvatar;

      await updateDoc(doc(db, "colaboradores", id), {
        avatar: uniqueUrl,
        avatarLock: true,
      });

      // otimista
      setColaboradores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, avatar: uniqueUrl, avatarLock: true } : c))
      );

      closeAvatarModal();
    } catch (e) {
      console.error(e);
      alert("Não foi possível salvar o avatar agora.");
    }
  };

  // ===== Edição
  const abrirEdicao = (colab: Colaborador) => {
    if (!colab.id) return;

    // tenta casar departmentId por nome quando só houver "departamento" (texto)
    let deptId = colab.departmentId || "";
    if (!deptId && colab.departamento) {
      const nomeLegacy = String(colab.departamento || "").toLowerCase();
      const found = departamentos.find(
        (d) => String(d?.nome || "").toLowerCase() === nomeLegacy
      );
      if (found?.id) deptId = found.id;
    }

    const nivel: Nivel = (colab.nivel as Nivel) || "junior";
    const gestorResponsavelId =
      nivel === "gestor" ? "" : (colab.gestorResponsavelId || "");

    setEditData({
      id: colab.id,
      nome: colab.nome || "",
      email: colab.email || "",
      status: colab.status || "ativo",
      genero: colab.genero || "male",
      departmentId: deptId,
      nivel,
      gestorResponsavelId,
      salarioBase:
        typeof colab.salarioBase === "number" && !Number.isNaN(colab.salarioBase)
          ? colab.salarioBase
          : 0,
      __prevDepartmentId: deptId, // guarda o estado atual para comparar no salvar
    });
    setEditOpen(true);

    if (nivel !== "gestor") {
      carregarGestores();
    }
  };

  useEffect(() => {
    if (!editOpen || !editData) return;
    if (editData.nivel !== "gestor") {
      carregarGestores();
    } else {
      // se virou gestor, limpa o campo gestorResponsavelId
      setEditData((prev) => (prev ? { ...prev, gestorResponsavelId: "" } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData?.nivel, editOpen]);

  const salvarEdicao = async () => {
    if (!editData) return;
    const {
      id,
      departmentId,
      __prevDepartmentId,
      nivel,
      gestorResponsavelId,
      salarioBase,
      ...rest
    } = editData;

    // validações mínimas
    if (!departmentId) {
      alert("Selecione um departamento.");
      return;
    }
    if (nivel !== "gestor" && !gestorResponsavelId) {
      alert("Selecione um gestor responsável.");
      return;
    }
    const salarioNum = Number(salarioBase);
    if (Number.isNaN(salarioNum) || salarioNum < 0) {
      alert("Informe um salário base válido (≥ 0).");
      return;
    }

    // grava também o nome para compatibilidade e para buscas offline
    const departamentoNome = deptMap.get(departmentId) || "";

    const payload = sanitize({
      ...rest,
      departmentId,
      departamento: departamentoNome,
      nivel,
      gestorResponsavelId: nivel === "gestor" ? undefined : gestorResponsavelId || undefined,
      salarioBase: salarioNum,
    });

    // se o depto mudou, ajusta contadores em batch
    const deptChanged = (departmentId || "") !== (__prevDepartmentId || "");

    if (deptChanged && departmentId) {
      const batch = writeBatch(db);

      // update do colaborador
      batch.update(doc(db, "colaboradores", id), payload);

      // decrementa no antigo (se houver)
      if (__prevDepartmentId) {
        batch.update(doc(db, "departamentos", __prevDepartmentId), {
          colaboradoresCount: increment(-1),
        });
      }
      // incrementa no novo
      batch.update(doc(db, "departamentos", departmentId), {
        colaboradoresCount: increment(+1),
      });

      await batch.commit();
    } else {
      // só atualiza o colaborador (sem mexer em contador)
      const ref = doc(db, "colaboradores", id);
      await updateDoc(ref, payload);
    }

    // otimista
    setColaboradores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...payload } : c))
    );

    setEditOpen(false);
  };

  // ===== Helpers de ID de departamento para um colaborador (considera legado)
  const deptIdFromColab = (c: Colaborador): string | undefined => {
    if (c.departmentId) return c.departmentId;
    const nome = (c.departamento || "").trim();
    if (!nome) return;
    const found = departamentos.find(
      (d) => (d.nome || "").toLowerCase() === nome.toLowerCase()
    );
    return found?.id;
  };

  // ===== Exclusão individual (com contador)
  const excluirUm = async (colab: Colaborador) => {
    if (!colab.id) return;
    const ok = window.confirm(`Excluir o colaborador "${colab.nome}"?`);
    if (!ok) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, "colaboradores", colab.id));

    // se conseguir identificar o departamento, decrementa
    const depId = deptIdFromColab(colab);
    if (depId) {
      batch.update(doc(db, "departamentos", depId), {
        colaboradoresCount: increment(-1),
      });
    }

    await batch.commit();
    if (!realtime) await resetAndReload();
  };

  // ===== Seleção em massa (com contador por depto)
  const excluirSelecionados = async () => {
    const ids = selectedIds;
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Excluir ${ids.length} colaborador(es) selecionado(s)?`
    );
    if (!ok) return;

    // pega os docs na memória
    const byId = new Map(colaboradores.map((c) => [c.id!, c]));

    // chunk para batches seguros
    for (let i = 0; i < ids.length; i += BATCH_SAFE_LIMIT) {
      const slice = ids.slice(i, i + BATCH_SAFE_LIMIT);
      const batch = writeBatch(db);
      const counters = new Map<string, number>();

      slice.forEach((id) => {
        const c = byId.get(id);
        if (!c) return;
        batch.delete(doc(db, "colaboradores", id));
        const depId = deptIdFromColab(c);
        if (depId) counters.set(depId, (counters.get(depId) || 0) - 1);
      });

      for (const [depId, delta] of counters) {
        batch.update(doc(db, "departamentos", depId), {
          colaboradoresCount: increment(delta),
        });
      }

      await batch.commit();
    }

    if (!realtime) await resetAndReload();
    else setSelectedIds([]);
  };

  // ===== Ações em massa: status
  const alterarStatusSelecionados = async (novo: "ativo" | "inativo") => {
    const ids = selectedIds;
    if (!ids.length) return;
    const ok = window.confirm(
      `Marcar ${ids.length} colaborador(es) como ${novo}?`
    );
    if (!ok) return;

    for (let i = 0; i < ids.length; i += BATCH_SAFE_LIMIT) {
      const slice = ids.slice(i, i + BATCH_SAFE_LIMIT);
      const batch = writeBatch(db);
      slice.forEach((id) => {
        batch.update(doc(db, "colaboradores", id), { status: novo });
      });
      await batch.commit();
    }

    // otimista
    setColaboradores((prev) =>
      prev.map((c) =>
        c.id && selectedIds.includes(c.id) ? { ...c, status: novo } : c
      )
    );

    if (!realtime) await resetAndReload();
    else setSelectedIds([]);
  };

  // ===== Ações em massa: mover para departamento
  const moverSelecionadosParaDepto = async () => {
    const ids = selectedIds;
    if (!ids.length) return;
    if (!moveDeptId) {
      alert("Selecione um departamento alvo para mover.");
      return;
    }
    const alvoNome = deptMap.get(moveDeptId) || "";
    const ok = window.confirm(
      `Mover ${ids.length} colaborador(es) para o departamento "${alvoNome}"?`
    );
    if (!ok) return;

    // snapshot atual em memória
    const byId = new Map(colaboradores.map((c) => [c.id!, c]));

    // vamos acumular contadores por depto
    let inc: Record<string, number> = {};
    let dec: Record<string, number> = {};

    for (let i = 0; i < ids.length; i += BATCH_SAFE_LIMIT) {
      const slice = ids.slice(i, i + BATCH_SAFE_LIMIT);
      const batch = writeBatch(db);

      slice.forEach((id) => {
        const c = byId.get(id);
        if (!c) return;

        const prevDep = deptIdFromColab(c);
        if (prevDep === moveDeptId) return; // já está no alvo

        const payload = {
          departmentId: moveDeptId,
          departamento: alvoNome, // compat
        };
        batch.update(doc(db, "colaboradores", id), payload);

        if (prevDep) dec[prevDep] = (dec[prevDep] || 0) + 1;
        inc[moveDeptId] = (inc[moveDeptId] || 0) + 1;
      });

      await batch.commit();
    }

    // aplica os contadores por chunk também (para não exceder 500 writes)
    const depIdsToUpdate = Array.from(
      new Set([...Object.keys(inc), ...Object.keys(dec)])
    );
    for (let i = 0; i < depIdsToUpdate.length; i += BATCH_SAFE_LIMIT) {
      const slice = depIdsToUpdate.slice(i, i + BATCH_SAFE_LIMIT);
      const batch = writeBatch(db);
      slice.forEach((depId) => {
        const delta = (inc[depId] || 0) - (dec[depId] || 0);
        if (!delta) return;
        batch.update(doc(db, "departamentos", depId), {
          colaboradoresCount: increment(delta),
        });
      });
      await batch.commit();
    }

    // otimista
    setColaboradores((prev) =>
      prev.map((c) => {
        if (!c.id || !selectedIds.includes(c.id)) return c;
        return { ...c, departmentId: moveDeptId, departamento: alvoNome };
      })
    );

    if (!realtime) await resetAndReload();
    else setSelectedIds([]);
  };

  const toggleSelect = (id?: string) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allFilteredHaveId = filtrados.every((c) => !!c.id);
  const allSelected =
    allFilteredHaveId &&
    filtrados.length > 0 &&
    filtrados.every((c) => c.id && selectedIds.includes(c.id));
  const someSelected = filtrados.some(
    (c) => c.id && selectedIds.includes(c.id)
  );

  const toggleSelectAllFiltered = () => {
    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filtrados.some((c) => c.id === id))
      );
    } else {
      const idsToAdd = filtrados.map((c) => c.id!).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const clearFilters = () => {
    setQ("");
    setDept("");
    setStatusFilter("");
    setGeneroFilter("");
  };

  // 🔁 toggle helper pros chips
  const toggleStatusFromChip = (value: "" | "ativo" | "inativo") => {
    setStatusFilter((prev) => (prev === value ? "" : value));
  };
  const toggleGeneroFromChip = (value: "" | Genero) => {
    setGeneroFilter((prev) => (prev === value ? "" : value));
  };

  // 🔧 handler seguro pro depto (com blur pra evitar stuck de foco)
  const handleDeptChange = (e: SelectChangeEvent<string>) => {
    const val = typeof e.target.value === "string" ? e.target.value : "";
    setDept(val);
    // blur para forçar fechamento limpo do menu em algumas combinações de modal/portal
    (e.target as HTMLElement)?.blur?.();
  };

  // ⬇️ Exportar CSV do resultado filtrado (com Nível)
  const exportCsv = () => {
    if (filtrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = ["Nome", "Email", "Departamento", "Nível", "Gênero", "Status"];
    const rows = filtrados.map((c) => [
      c.nome ?? "",
      c.email ?? "",
      depName(c),
      labelNivel(c.nivel),
      labelGenero(c.genero),
      c.status ?? "",
    ]);

    // CSV com ; e BOM para abrir bem no Excel/PT-BR
    const toCsvLine = (arr: string[]) =>
      arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
    const csv = [toCsvLine(header), ...rows.map((r) => toCsvLine(r as string[]))].join(
      "\n"
    );

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `colaboradores_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <LocalErrorBoundary>
      <Box sx={{ p: 2, width: "100%" }}>
        {/* Header + Filtros */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h4" fontWeight={600}>
            Colaboradores
          </Typography>

          <Box
            sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
          >
            <TextField
              size="small"
              label="Buscar por nome, e-mail ou depto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {/* Departamento (docs + legados) */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="dept-label">Departamento</InputLabel>
              <Select
                labelId="dept-label"
                label="Departamento"
                value={dept || ""}
                onChange={handleDeptChange}
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                <MenuItem value="">Todos</MenuItem>
                {deptOptionsUnion.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nome} {d.legacy ? "(legado)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </Select>
            </FormControl>

            {/* Gênero */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="genero-filter-label">Gênero</InputLabel>
              <Select
                labelId="genero-filter-label"
                label="Gênero"
                value={generoFilter}
                onChange={(e) => setGeneroFilter(e.target.value as any)}
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="male">Masculino</MenuItem>
                <MenuItem value="female">Feminino</MenuItem>
              </Select>
            </FormControl>

            {(q || dept || statusFilter || generoFilter) && (
              <Button variant="text" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={realtime}
                onChange={(e) => setRealtime(e.target.checked)}
                inputProps={{ "aria-label": "tempo real" }}
              />
              <Typography variant="body2">Tempo real</Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={exportCsv}
                disabled={filtrados.length === 0}
              >
                Exportar CSV
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={selectedIds.length === 0}
                onClick={excluirSelecionados}
              >
                Excluir selecionados ({selectedIds.length})
              </Button>
              <Button variant="contained" color="success" onClick={handleOpenCreate}>
                Novo Colaborador
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Barra de ações em massa */}
        <Paper sx={{ p: 1.5, mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Chip
              label={`Selecionados: ${selectedIds.length}`}
              color={selectedIds.length ? "primary" : "default"}
              variant={selectedIds.length ? "filled" : "outlined"}
            />
            <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => alterarStatusSelecionados("ativo")}
                disabled={selectedIds.length === 0}
              >
                Marcar como Ativo
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => alterarStatusSelecionados("inativo")}
                disabled={selectedIds.length === 0}
              >
                Marcar como Inativo
              </Button>
            </Stack>
            <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel id="move-dept-label">Mover p/ departamento</InputLabel>
                <Select
                  labelId="move-dept-label"
                  label="Mover p/ departamento"
                  value={moveDeptId}
                  onChange={(e) => setMoveDeptId(String(e.target.value))}
                  MenuProps={{ disablePortal: true, keepMounted: true }}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {departamentos.map((d) => (
                    <MenuItem key={d.id} value={d.id!}>
                      {d.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="contained"
                onClick={moverSelecionadosParaDepto}
                disabled={selectedIds.length === 0 || !moveDeptId}
              >
                Mover selecionados
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Chips de totais (com base no resultado filtrado) */}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={`Resultados: ${stats.total}`} variant="outlined" />
          <Chip
            label={`Ativos: ${stats.ativos}`}
            color={statusFilter === "ativo" ? "success" : "default"}
            variant={statusFilter === "ativo" ? "filled" : "outlined"}
            onClick={() => toggleStatusFromChip("ativo")}
          />
          <Chip
            label={`Inativos: ${stats.inativos}`}
            color={statusFilter === "inativo" ? "error" : "default"}
            variant={statusFilter === "inativo" ? "filled" : "outlined"}
            onClick={() => toggleStatusFromChip("inativo")}
          />
          <Chip
            label={`Masculino: ${stats.male}`}
            color={generoFilter === "male" ? "primary" : "default"}
            variant={generoFilter === "male" ? "filled" : "outlined"}
            onClick={() => toggleGeneroFromChip("male")}
          />
          <Chip
            label={`Feminino: ${stats.female}`}
            color={generoFilter === "female" ? "secondary" : "default"}
            variant={generoFilter === "female" ? "filled" : "outlined"}
            onClick={() => toggleGeneroFromChip("female")}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabela */}
        <Paper sx={{ width: "100%", p: 0 }}>
          <TableContainer sx={{ maxHeight: "calc(100vh - 320px)" }}>
            <Table stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someSelected && !allSelected}
                      checked={allSelected}
                      onChange={toggleSelectAllFiltered}
                      disabled={!allFilteredHaveId || filtrados.length === 0}
                      inputProps={{ "aria-label": "selecionar todos" }}
                    />
                  </TableCell>

                  <TableCell onClick={() => handleSort("nome")}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                      }}
                    >
                      Nome {sortIcon("nome")}
                    </Box>
                  </TableCell>

                  <TableCell onClick={() => handleSort("email")}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    >
                      Email {sortIcon("email")}
                    </Box>
                  </TableCell>

                  <TableCell onClick={() => handleSort("departamento")}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    >
                      Departamento {sortIcon("departamento")}
                    </Box>
                  </TableCell>

                  <TableCell onClick={() => handleSort("nivel")}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    >
                      Nível {sortIcon("nivel")}
                    </Box>
                  </TableCell>

                  <TableCell onClick={() => handleSort("genero")}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    >
                      Gênero {sortIcon("genero")}
                    </Box>
                  </TableCell>

                  <TableCell onClick={() => handleSort("status")}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
                    >
                      Status {sortIcon("status")}
                    </Box>
                  </TableCell>

                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Stack direction="row" justifyContent="center" alignItems="center" gap={1}>
                        <CircularProgress size={20} /> Carregando...
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box textAlign="center" py={5}>
                        <Typography variant="subtitle1" gutterBottom>
                          Nenhum colaborador encontrado
                        </Typography>
                        {(q || dept || statusFilter || generoFilter) && (
                          <Button onClick={clearFilters} variant="outlined" size="small">
                            Limpar filtros
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((colab, index) => {
                    const id = colab.id;
                    const checked = !!(id && selectedIds.includes(id));
                    return (
                      <TableRow key={id || `row-${index}`} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleSelect(id)}
                            disabled={!id}
                            inputProps={{
                              "aria-label": `selecionar ${colab.nome || "colaborador"}`,
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar
                            src={colab?.avatar || undefined}
                            alt={colab?.nome || "Avatar"}
                            onClick={() => abrirModalAvatar(colab)}
                            sx={{ cursor: "pointer" }}
                          >
                            {(colab?.nome || "?").charAt(0)}
                          </Avatar>
                          {colab?.nome || "—"}
                        </TableCell>

                        <TableCell>{colab?.email || "—"}</TableCell>
                        <TableCell>{depName(colab)}</TableCell>

                        <TableCell>{labelNivel(colab.nivel)}</TableCell>

                        <TableCell>{labelGenero(colab.genero)}</TableCell>

                        {/* Status */}
                        <TableCell>
                          {(() => {
                            const st = colab?.status == null ? "" : String(colab.status);
                            const stTrim = st.trim();
                            const isAtivo = stTrim.toLowerCase() === "ativo";
                            return stTrim ? (
                              <span
                                style={{
                                  backgroundColor: isAtivo ? "#16a34a33" : "#dc262633",
                                  color:          isAtivo ? "#16a34a"   : "#dc2626",
                                  padding: "4px 12px",
                                  borderRadius: "12px",
                                  fontWeight: "bold",
                                  fontSize: "0.85rem",
                                  whiteSpace: "nowrap",
                                  display: "inline-block",
                                }}
                              >
                                {stTrim.charAt(0).toUpperCase() + stTrim.slice(1)}
                              </span>
                            ) : (
                              "—"
                            );
                          })()}
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Editar">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => abrirEdicao(colab)}
                                  disabled={!colab.id}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => excluirUm(colab)}
                                  disabled={!colab.id}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {/* Rodapé com "Carregar mais" */}
                {!loading && hasMore && !realtime && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        variant="text"
                        size="small"
                      >
                        {loadingMore ? (
                          <Stack direction="row" alignItems="center" gap={1}>
                            <CircularProgress size={18} /> Carregando...
                          </Stack>
                        ) : (
                          "Carregar mais"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Modal Avatar */}
        <Modal open={avatarModalOpen} onClose={closeAvatarModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 4,
              width: "100%",
              maxWidth: 400,
              boxShadow: 24,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h6">Escolher Avatar</Typography>
            <Button
              variant="outlined"
              onClick={() => {
                const nomeSel = colaboradorSelecionado?.nome || "";
                if (!colaboradorSelecionado) return;
                salvarAvatar(gerarAvatar(nomeSel, "male"));
              }}
              disabled={!colaboradorSelecionado}
            >
              Gerar Masculino
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const nomeSel = colaboradorSelecionado?.nome || "";
                if (!colaboradorSelecionado) return;
                salvarAvatar(gerarAvatar(nomeSel, "female"));
              }}
              disabled={!colaboradorSelecionado}
            >
              Gerar Feminino
            </Button>
            <TextField
              label="URL personalizado"
              value={customAvatarUrl}
              onChange={(e) => setCustomAvatarUrl(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => salvarAvatar(customAvatarUrl)}
              disabled={!customAvatarUrl.trim() || !colaboradorSelecionado}
            >
              Salvar URL
            </Button>
          </Box>
        </Modal>

        {/* Modal Edição */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)}>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              salvarEdicao();
            }}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 4,
              width: "100%",
              maxWidth: 620,
              boxShadow: 24,
              display: "grid",
              gap: 2,
            }}
          >
            <Typography variant="h6">Editar colaborador</Typography>

            <TextField
              label="Nome"
              value={editData?.nome || ""}
              onChange={(e) =>
                setEditData((prev) => (prev ? { ...prev, nome: e.target.value } : prev))
              }
              required
            />
            <TextField
              label="E-mail"
              type="email"
              value={editData?.email || ""}
              onChange={(e) =>
                setEditData((prev) => (prev ? { ...prev, email: e.target.value } : prev))
              }
              required
            />

            {/* Departamento por ID */}
            <FormControl>
              <InputLabel id="edit-dept-label">Departamento</InputLabel>
              <Select
                labelId="edit-dept-label"
                label="Departamento"
                value={editData?.departmentId || ""}
                onChange={(e) =>
                  setEditData((prev) =>
                    prev
                      ? {
                          ...prev,
                          departmentId: String(e.target.value),
                        }
                      : prev
                  )
                }
                required
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                {departamentos.length === 0 ? (
                  <MenuItem value="" disabled>
                    Nenhum departamento cadastrado
                  </MenuItem>
                ) : (
                  departamentos.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.nome}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {/* Nível */}
            <FormControl>
              <InputLabel id="nivel-label">Nível</InputLabel>
              <Select
                labelId="nivel-label"
                label="Nível"
                value={editData?.nivel || "junior"}
                onChange={(e) =>
                  setEditData((prev) =>
                    prev ? { ...prev, nivel: e.target.value as Nivel } : prev
                  )
                }
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                <MenuItem value="junior">Júnior</MenuItem>
                <MenuItem value="pleno">Pleno</MenuItem>
                <MenuItem value="senior">Sênior</MenuItem>
                <MenuItem value="gestor">Gestor</MenuItem>
              </Select>
            </FormControl>

            {/* Gestor responsável (somente se não for gestor) */}
            {editData?.nivel !== "gestor" && (
              <FormControl>
                <InputLabel id="gestor-label">Gestor responsável</InputLabel>
                <Select
                  labelId="gestor-label"
                  label="Gestor responsável"
                  value={editData?.gestorResponsavelId || ""}
                  onOpen={carregarGestores}
                  onChange={(e) =>
                    setEditData((prev) =>
                      prev
                        ? { ...prev, gestorResponsavelId: String(e.target.value) }
                        : prev
                    )
                  }
                  required
                  MenuProps={{ disablePortal: true, keepMounted: true }}
                >
                  {loadingGestores ? (
                    <MenuItem value="" disabled>
                      Carregando...
                    </MenuItem>
                  ) : gestores.length === 0 ? (
                    <MenuItem value="" disabled>
                      Nenhum gestor encontrado
                    </MenuItem>
                  ) : (
                    gestores.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.nome || g.email || g.id}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}

            {/* Salário base */}
            <TextField
              label="Salário base"
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={editData?.salarioBase ?? 0}
              onChange={(e) =>
                setEditData((prev) =>
                  prev ? { ...prev, salarioBase: Number(e.target.value) } : prev
                )
              }
              required
            />

            <FormControl>
              <FormLabel id="genero-edit-label">Gênero</FormLabel>
              <RadioGroup
                row
                aria-labelledby="genero-edit-label"
                value={editData?.genero || "male"}
                onChange={(e) =>
                  setEditData((prev) =>
                    prev ? { ...prev, genero: e.target.value as Genero } : prev
                  )
                }
              >
                <FormControlLabel value="male" control={<Radio />} label="Masculino" />
                <FormControlLabel value="female" control={<Radio />} label="Feminino" />
              </RadioGroup>
            </FormControl>

            <FormControl>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                value={editData?.status || "ativo"}
                onChange={(e) =>
                  setEditData((prev) =>
                    prev ? { ...prev, status: String(e.target.value) } : prev
                  )
                }
                MenuProps={{ disablePortal: true, keepMounted: true }}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
              <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="contained">
                Salvar
              </Button>
            </Stack>
          </Box>
        </Modal>

        {/* Modal Novo Colaborador */}
        <Modal open={openCreate} onClose={handleCloseCreate}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              borderRadius: 2,
              p: 4,
              width: "100%",
              maxWidth: 600,
              boxShadow: 24,
            }}
          >
            <StepForm onFinish={handleCloseCreate} />
          </Box>
        </Modal>
      </Box>
    </LocalErrorBoundary>
  );
};
