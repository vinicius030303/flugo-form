import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  TablePagination,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalculateIcon from "@mui/icons-material/Calculate";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import {
  listarDepartamentos,
  criarDepartamento,
  atualizarDepartamento,
  excluirDepartamento,
  type Departamento,
} from "@/services/departamentos";

import { db } from "@/services/firebase";
import {
  collection,
  getDocs,
  query as fbQuery,
  where,
  doc,
  updateDoc,
  onSnapshot,
  writeBatch,
  increment,
} from "firebase/firestore";

type OrderKey = "nome" | "count";
type OrderDir = "asc" | "desc";

type Genero = "male" | "female";
type Nivel = "junior" | "pleno" | "senior" | "gestor";

type ColabLite = {
  id: string;
  nome?: string;
  email?: string;
  departmentId?: string;
  departamento?: string;
  nivel?: Nivel;
  genero?: Genero;
  status?: string;
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Departamentos() {
  // fonte de verdade em tempo real
  const [depsRealtime, setDepsRealtime] = useState<Departamento[]>([]);
  const [countsById, setCountsById] = useState<Map<string, number>>(new Map());
  const [countsByLegacy, setCountsByLegacy] = useState<Map<string, number>>(new Map());
  const [colabsRealtime, setColabsRealtime] = useState<ColabLite[]>([]);

  // UI
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Departamento | null>(null);
  const [nome, setNome] = useState("");
  const [gestorId, setGestorId] = useState<string>("");
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recounting, setRecounting] = useState(false);

  // ordenação / paginação
  const [orderByKey, setOrderByKey] = useState<OrderKey>("nome");
  const [order, setOrder] = useState<OrderDir>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // === Realtime listeners ===
  useEffect(() => {
    // departamentos ao vivo
    const unsubDeps = onSnapshot(collection(db, "departamentos"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setDepsRealtime(
        list.sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
        )
      );
    });

    // colaboradores ao vivo → contadores por ID + por nome legado + lista para UI
    const unsubColabs = onSnapshot(collection(db, "colaboradores"), (snap) => {
      const byId = new Map<string, number>();
      const byLegacy = new Map<string, number>();
      const colabs: ColabLite[] = [];

      snap.docs.forEach((docSnap) => {
        const id = docSnap.id;
        const c = docSnap.data() as any;
        colabs.push({
          id,
          nome: c?.nome || "",
          email: c?.email || "",
          departmentId: c?.departmentId || "",
          departamento: c?.departamento || "",
          nivel: c?.nivel,
          genero: c?.genero,
          status: c?.status,
        });

        if (c.departmentId) {
          byId.set(c.departmentId, (byId.get(c.departmentId) || 0) + 1);
        } else if (c.departamento) {
          const key = norm(String(c.departamento));
          byLegacy.set(key, (byLegacy.get(key) || 0) + 1);
        }
      });

      colabs.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
      );

      setCountsById(byId);
      setCountsByLegacy(byLegacy);
      setColabsRealtime(colabs);
    });

    return () => {
      unsubDeps();
      unsubColabs();
    };
  }, []);

  // mescla contagens ao vivo (ID + legado por nome) nos departamentos
  const depsWithCounts = useMemo(() => {
    return depsRealtime.map((d) => {
      const idCount = d.id ? countsById.get(d.id) || 0 : 0;
      const legacyCount = countsByLegacy.get(norm(d.nome || "")) || 0;
      return { ...d, colaboradoresCount: idCount + legacyCount };
    });
  }, [depsRealtime, countsById, countsByLegacy]);

  // mapa de id -> nome do departamento
  const depNameById = useMemo(() => {
    const m = new Map<string, string>();
    depsRealtime.forEach((d) => d.id && m.set(d.id, d.nome || ""));
    return m;
  }, [depsRealtime]);

  // lista de gestores (somente nivel === "gestor")
  const gestores: ColabLite[] = useMemo(
    () => colabsRealtime.filter((c) => c.nivel === "gestor"),
    [colabsRealtime]
  );

  // membros atuais (somente por id, ignora legado aqui; legado só para contagem)
  const currentMembersOf = (depId?: string) =>
    depId ? colabsRealtime.filter((c) => c.departmentId === depId) : [];

  // candidatos a adicionar (não estão neste depto; podem estar sem depto ou em outro — ao salvar, faremos transferência)
  const addOptionsFor = (depId?: string) =>
    depId
      ? colabsRealtime.filter((c) => c.departmentId !== depId)
      : colabsRealtime;

  // filtro por busca
  const filtrados = useMemo(() => {
    const n = norm(q);
    return depsWithCounts.filter((d) => norm(d.nome || "").includes(n));
  }, [depsWithCounts, q]);

  // ordenação
  const filtradosOrdenados = useMemo(() => {
    const arr = [...filtrados];
    arr.sort((a, b) => {
      if (orderByKey === "nome") {
        const av = norm(a.nome || ""), bv = norm(b.nome || "");
        const cmp = av.localeCompare(bv, "pt-BR");
        return order === "asc" ? cmp : -cmp;
      } else {
        const av = a.colaboradoresCount ?? 0;
        const bv = b.colaboradoresCount ?? 0;
        const cmp = av === bv ? 0 : av < bv ? -1 : 1;
        return order === "asc" ? cmp : -cmp;
      }
    });
    return arr;
  }, [filtrados, orderByKey, order]);

  // página atual
  const pageSlice = useMemo(() => {
    const start = page * rowsPerPage;
    return filtradosOrdenados.slice(start, start + rowsPerPage);
  }, [filtradosOrdenados, page, rowsPerPage]);

  // resumo
  const resumo = useMemo(() => {
    const totalSistema = depsWithCounts.length;
    const totalMostrados = filtradosOrdenados.length;
    const somaColabsMostrados = filtradosOrdenados.reduce(
      (acc, d) => acc + (d.colaboradoresCount ?? 0),
      0
    );
    const somaColabsSistema = depsWithCounts.reduce(
      (acc, d) => acc + (d.colaboradoresCount ?? 0),
      0
    );
    return { totalSistema, totalMostrados, somaColabsMostrados, somaColabsSistema };
  }, [depsWithCounts, filtradosOrdenados]);

  // ações
  const handleSort = (key: OrderKey) => {
    if (orderByKey === key) setOrder((p) => (p === "asc" ? "desc" : "asc"));
    else { setOrderByKey(key); setOrder("asc"); }
  };
  const sortIcon = (key: OrderKey) =>
    orderByKey !== key ? (
      <ArrowDownwardIcon fontSize="small" sx={{ opacity: 0.3 }} />
    ) : order === "asc" ? (
      <ArrowUpwardIcon fontSize="small" />
    ) : (
      <ArrowDownwardIcon fontSize="small" />
    );

  function abrirNovo() {
    setEdit(null);
    setNome("");
    setGestorId("");
    setAddMemberIds([]);
    setOpen(true);
  }

  function abrirEdicao(dep: Departamento) {
    setEdit(dep);
    setNome(dep.nome || "");
    setGestorId(((dep as any)?.gestorResponsavelId as string) || "");
    setAddMemberIds([]);
    setOpen(true);
  }

  async function salvar() {
    try {
      const trimmed = nome.trim();
      if (!trimmed) return alert("Informe o nome do departamento.");

      // valida duplicidade de nome
      const existe = depsWithCounts.some(
        (d) => norm(d.nome || "") === norm(trimmed) && d.id !== edit?.id
      );
      if (existe) return alert("Já existe um departamento com esse nome.");

      // valida gestor (se informado, precisa existir e ser nível gestor)
      if (gestorId) {
        const gestorValido = gestores.some((g) => g.id === gestorId);
        if (!gestorValido) {
          return alert("O gestor responsável deve ser um colaborador com nível 'gestor'.");
        }
      }

      setSaving(true);

      if (edit?.id) {
        // EDITAR
        const depId = edit.id;

        // 1) atualizar nome (service existente)
        if (trimmed !== (edit.nome || "")) {
          await atualizarDepartamento(depId, trimmed);
        }

        // 2) atualizar gestorResponsavelId (direto no doc, para não quebrar service)
        await updateDoc(doc(db, "departamentos", depId), {
          gestorResponsavelId: gestorId || null,
        });

        // 3) adicionar/transferir colaboradores selecionados
        if (addMemberIds.length > 0) {
          // snapshot atual em memória
          const byId = new Map(colabsRealtime.map((c) => [c.id, c]));
          // contadores por depto (ajuste)
          const inc: Record<string, number> = {};
          const dec: Record<string, number> = {};

          // chunk seguro de 450 writes
          const BATCH_SAFE_LIMIT = 450;

          for (let i = 0; i < addMemberIds.length; i += BATCH_SAFE_LIMIT) {
            const slice = addMemberIds.slice(i, i + BATCH_SAFE_LIMIT);
            const batch = writeBatch(db);

            slice.forEach((colabId) => {
              const c = byId.get(colabId);
              if (!c) return;

              const prevDep = c.departmentId || undefined;
              if (prevDep === depId) return; // já está neste departamento

              const payload = {
                departmentId: depId,
                departamento: trimmed, // compat nome
              };

              batch.update(doc(db, "colaboradores", colabId), payload);

              if (prevDep) dec[prevDep] = (dec[prevDep] || 0) + 1;
              inc[depId] = (inc[depId] || 0) + 1;
            });

            await batch.commit();
          }

          // aplica contadores (respeitando limite por batch)
          const depIdsToUpdate = Array.from(new Set([...Object.keys(inc), ...Object.keys(dec)]));
          for (let i = 0; i < depIdsToUpdate.length; i += 450) {
            const slice = depIdsToUpdate.slice(i, i + 450);
            const batch = writeBatch(db);
            slice.forEach((dId) => {
              const delta = (inc[dId] || 0) - (dec[dId] || 0);
              if (!delta) return;
              batch.update(doc(db, "departamentos", dId), {
                colaboradoresCount: increment(delta),
              });
            });
            await batch.commit();
          }
        }

        setOpen(false);
      } else {
        // CRIAR
        // 1) criar departamento (service existente retorna id)
        const depId = await criarDepartamento(trimmed);

        // 2) setar gestor (se houver)
        await updateDoc(doc(db, "departamentos", depId), {
          gestorResponsavelId: gestorId || null,
        });

        // 3) adicionar colaboradores selecionados (transferências)
        if (addMemberIds.length > 0) {
          const byId = new Map(colabsRealtime.map((c) => [c.id, c]));
          const inc: Record<string, number> = {};
          const dec: Record<string, number> = {};

          for (let i = 0; i < addMemberIds.length; i += 450) {
            const slice = addMemberIds.slice(i, i + 450);
            const batch = writeBatch(db);

            slice.forEach((colabId) => {
              const c = byId.get(colabId);
              if (!c) return;

              const prevDep = c.departmentId || undefined;
              const payload = {
                departmentId: depId,
                departamento: trimmed,
              };

              batch.update(doc(db, "colaboradores", colabId), payload);

              if (prevDep) dec[prevDep] = (dec[prevDep] || 0) + 1;
              inc[depId] = (inc[depId] || 0) + 1;
            });

            await batch.commit();
          }

          const depIdsToUpdate = Array.from(new Set([...Object.keys(inc), ...Object.keys(dec)]));
          for (let i = 0; i < depIdsToUpdate.length; i += 450) {
            const slice = depIdsToUpdate.slice(i, i + 450);
            const batch = writeBatch(db);
            slice.forEach((dId) => {
              const delta = (inc[dId] || 0) - (dec[dId] || 0);
              if (!delta) return;
              batch.update(doc(db, "departamentos", dId), {
                colaboradoresCount: increment(delta),
              });
            });
            await batch.commit();
          }
        }

        setOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Não foi possível salvar o departamento.");
    } finally {
      setSaving(false);
    }
  }

  async function apagar(dep: Departamento) {
    if (!dep.id) return;
    try {
      const count = dep.colaboradoresCount ?? 0;
      if (count > 0) {
        return alert(
          `Não é possível excluir: existem ${count} colaborador(es) vinculados a "${dep.nome}".`
        );
      }
      // checagem legado por nome
      const qLegacy = fbQuery(
        collection(db, "colaboradores"),
        where("departamento", "==", dep.nome || "")
      );
      const snapLegacy = await getDocs(qLegacy);
      if (!snapLegacy.empty) {
        return alert(
          `Não é possível excluir: ainda existem ${snapLegacy.size} colaborador(es) antigos vinculados por nome a "${dep.nome}".`
        );
      }

      if (!window.confirm(`Excluir o departamento "${dep.nome}"?`)) return;
      await excluirDepartamento(dep.id);
    } catch (e) {
      console.error(e);
      alert("Não foi possível excluir o departamento.");
    }
  }

  // grava os totais (backfill) no Firestore
  async function recomputeAndFixCounts() {
    setRecounting(true);
    try {
      const deps = await listarDepartamentos(); // ids/nomes frescos
      const idByNormName = new Map<string, string>();
      deps.forEach((d) => d.id && idByNormName.set(norm(d.nome || ""), d.id));

      // total por ID + legado por nome → consolida por ID
      const totals = new Map<string, number>();
      countsById.forEach((v, id) => totals.set(id, (totals.get(id) || 0) + v));
      countsByLegacy.forEach((v, nameNorm) => {
        const id = idByNormName.get(nameNorm);
        if (id) totals.set(id, (totals.get(id) || 0) + v);
      });

      const updates: Promise<any>[] = [];
      deps.forEach((d) => {
        if (!d.id) return;
        const newCount = totals.get(d.id) || 0;
        if ((d.colaboradoresCount ?? 0) !== newCount) {
          updates.push(updateDoc(doc(db, "departamentos", d.id), { colaboradoresCount: newCount }));
        }
      });
      if (updates.length) await Promise.all(updates);
    } catch (e) {
      console.error("Falha ao recontar/gravar", e);
      alert("Não foi possível recontar agora.");
    } finally {
      setRecounting(false);
    }
  }

  const recarregar = async () => {
    setLoading(true);
    try {
      // força um pull “manual” para o caso de querer atualizar nomes/ordem
      const fresh = await listarDepartamentos();
      setDepsRealtime(
        fresh.sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ["Nome", "Colaboradores"];
    const rows = filtradosOrdenados.map((d) => [d.nome ?? "", String(d.colaboradoresCount ?? 0)]);
    const toCsvLine = (arr: string[]) =>
      arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
    const csv = [toCsvLine(header), ...rows.map((r) => toCsvLine(r as string[]))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `departamentos_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // componentes auxiliares para o diálogo
  const currentMembersChips = useMemo(() => {
    if (!edit?.id) return null;
    const members = currentMembersOf(edit.id);
    if (members.length === 0) {
      return <Typography variant="body2" color="text.secondary">Nenhum colaborador neste departamento ainda.</Typography>;
    }
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {members.map((m) => (
          <Chip key={m.id} label={m.nome || m.email || m.id} />
        ))}
      </Stack>
    );
  }, [edit, colabsRealtime]);

  const addOptions = useMemo(() => addOptionsFor(edit?.id), [colabsRealtime, edit]);

  const addSelectedObjects = useMemo(
    () => addMemberIds.map((id) => addOptions.find((c) => c.id === id)).filter(Boolean) as ColabLite[],
    [addMemberIds, addOptions]
  );

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Typography variant="h4" fontWeight={600}>Departamentos</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <TextField
            size="small"
            label="Pesquisar por nome"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={recarregar}
            disabled={loading}
          >
            Recarregar
          </Button>
          <Button
            variant="outlined"
            startIcon={recounting ? <CircularProgress size={16} /> : <CalculateIcon />}
            onClick={recomputeAndFixCounts}
            disabled={recounting}
          >
            Recontar
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv} disabled={filtradosOrdenados.length === 0}>
            Exportar CSV
          </Button>
          <Button variant="contained" color="success" onClick={abrirNovo}>
            Novo departamento
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <Chip label={`Mostrando: ${filtradosOrdenados.length} de ${depsWithCounts.length}`} variant="outlined" />
        <Chip label={`Colaboradores (nestes): ${filtradosOrdenados.reduce((a, d) => a + (d.colaboradoresCount ?? 0), 0)}`} color="primary" />
        <Chip label={`Colaboradores (total no sistema): ${depsWithCounts.reduce((a, d) => a + (d.colaboradoresCount ?? 0), 0)}`} color="secondary" />
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => handleSort("nome")} sx={{ cursor: "pointer" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  Nome {sortIcon("nome")}
                </Box>
              </TableCell>
              <TableCell align="center" onClick={() => handleSort("count")} sx={{ cursor: "pointer", width: 160 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                  Colaboradores {sortIcon("count")}
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ width: 160 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageSlice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">Nenhum departamento</TableCell>
              </TableRow>
            ) : (
              pageSlice.map((d) => {
                const count = d.colaboradoresCount ?? 0;
                const canDelete = count === 0;
                return (
                  <TableRow key={d.id || d.nome} hover>
                    <TableCell>{d.nome}</TableCell>
                    <TableCell align="center">
                      <Chip label={String(count)} color={count > 0 ? "primary" : "default"} variant={count > 0 ? "filled" : "outlined"} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => abrirEdicao(d)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={canDelete ? "Excluir" : "Há colaboradores vinculados — exclua/edite-os antes"}>
                        <span>
                          <IconButton size="small" color="error" onClick={() => apagar(d)} disabled={!canDelete}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          rowsPerPageOptions={[5, 10, 25, 50]}
          count={filtradosOrdenados.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? "Editar departamento" : "Novo departamento"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField autoFocus margin="dense" label="Nome" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} />

            <FormControl fullWidth>
              <InputLabel id="gestor-resp-label">Gestor responsável</InputLabel>
              <Select
                labelId="gestor-resp-label"
                label="Gestor responsável"
                value={gestorId}
                onChange={(e) => setGestorId(String(e.target.value))}
                displayEmpty
              >
                <MenuItem value="">
                  <em>— Nenhum —</em>
                </MenuItem>
                {gestores.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.nome || g.email || g.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {edit?.id && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Colaboradores atuais
                </Typography>
                {currentMembersChips}
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Adicionar colaboradores
              </Typography>
              <Autocomplete
                multiple
                options={addOptions}
                getOptionLabel={(o) =>
                  o?.nome
                    ? `${o.nome}${o.email ? ` (${o.email})` : ""}${
                        o.departmentId
                          ? ` — ${depNameById.get(o.departmentId) || "Outro dep."}`
                          : o.departamento
                          ? ` — ${o.departamento} (legado)`
                          : " — Sem departamento"
                      }`
                    : o?.email || o?.id || ""
                }
                value={addSelectedObjects}
                onChange={(_, values) => setAddMemberIds(values.map((v) => v.id))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Busque por nome ou e-mail e selecione..."
                  />
                )}
                ListboxProps={{ style: { maxHeight: 300 } }}
                filterSelectedOptions
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
