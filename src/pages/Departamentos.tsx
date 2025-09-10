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
} from "@mui/material";
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
} from "firebase/firestore";

type OrderKey = "nome" | "count";
type OrderDir = "asc" | "desc";

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Departamentos() {
  // fonte de verdade em tempo real
  const [depsRealtime, setDepsRealtime] = useState<Departamento[]>([]);
  const [countsById, setCountsById] = useState<Map<string, number>>(new Map());
  const [countsByLegacy, setCountsByLegacy] = useState<Map<string, number>>(new Map());

  // UI
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Departamento | null>(null);
  const [nome, setNome] = useState("");
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

    // colaboradores ao vivo → contadores por ID + por nome legado
    const unsubColabs = onSnapshot(collection(db, "colaboradores"), (snap) => {
      const byId = new Map<string, number>();
      const byLegacy = new Map<string, number>();
      snap.docs.forEach((docSnap) => {
        const c = docSnap.data() as any;
        if (c.departmentId) {
          byId.set(c.departmentId, (byId.get(c.departmentId) || 0) + 1);
        } else if (c.departamento) {
          const key = norm(String(c.departamento));
          byLegacy.set(key, (byLegacy.get(key) || 0) + 1);
        }
      });
      setCountsById(byId);
      setCountsByLegacy(byLegacy);
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

  function abrirNovo() { setEdit(null); setNome(""); setOpen(true); }
  function abrirEdicao(dep: Departamento) { setEdit(dep); setNome(dep.nome || ""); setOpen(true); }

  async function salvar() {
    try {
      const trimmed = nome.trim();
      if (!trimmed) return alert("Informe o nome do departamento.");

      const existe = depsWithCounts.some(
        (d) => norm(d.nome || "") === norm(trimmed) && d.id !== edit?.id
      );
      if (existe) return alert("Já existe um departamento com esse nome.");

      if (edit?.id) await atualizarDepartamento(edit.id, trimmed);
      else await criarDepartamento(trimmed);

      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Não foi possível salvar o departamento.");
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
          <TextField autoFocus margin="dense" label="Nome" fullWidth value={nome} onChange={(e) => setNome(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvar}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
