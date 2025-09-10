// src/pages/Logs.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { listRecentLogs, streamRecentLogs, type LogEntry } from "@/services/logs";

const norm = (s?: string | null) =>
  String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function formatTs(ts?: any) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");

  // tempo real
  useEffect(() => {
    if (!live) return;
    const unsub = streamRecentLogs(500, setLogs);
    return unsub;
  }, [live]);

  // carga manual
  const reload = async () => {
    setLoading(true);
    try {
      const data = await listRecentLogs(500);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!live) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const filtrados = useMemo(() => {
    const nq = norm(q);
    return logs.filter((l) => {
      const txt =
        norm(l.action) +
        " " +
        norm(l.actor?.email) +
        " " +
        norm(l.entity?.type) +
        " " +
        norm(l.entity?.name) +
        " " +
        norm(l.entity?.id) +
        " " +
        norm(JSON.stringify(l.payload || {}));

      const matchText = !nq || txt.includes(nq);
      const matchAction = !action || l.action === action;
      const matchEntity = !entityType || l.entity?.type === entityType;
      return matchText && matchAction && matchEntity;
    });
  }, [logs, q, action, entityType]);

  // export CSV (resultado filtrado)
  const exportCsv = () => {
    if (filtrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const header = [
      "Data/Hora",
      "Ação",
      "Entidade",
      "Entidade ID",
      "Entidade Nome",
      "Ator (email)",
      "Ator (uid)",
      "Detalhes",
    ];
    const rows = filtrados.map((l) => [
      formatTs(l.createdAt),
      l.action || "",
      l.entity?.type || "",
      l.entity?.id || "",
      l.entity?.name || "",
      l.actor?.email || "",
      l.actor?.uid || "",
      JSON.stringify(l.payload || {}),
    ]);
    const toCsvLine = (arr: string[]) =>
      arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
    const csv = [toCsvLine(header), ...rows.map((r) => toCsvLine(r as string[]))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `logs_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={1} flexWrap="wrap">
        <Typography variant="h4" fontWeight={600}>Logs</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <TextField size="small" label="Buscar (texto livre)" value={q} onChange={(e) => setQ(e.target.value)} />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="act-label">Ação</InputLabel>
            <Select labelId="act-label" label="Ação" value={action} onChange={(e) => setAction(String(e.target.value))}>
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="colaborador:create">colaborador:create</MenuItem>
              <MenuItem value="colaborador:update">colaborador:update</MenuItem>
              <MenuItem value="colaborador:move">colaborador:move</MenuItem>
              <MenuItem value="colaborador:delete">colaborador:delete</MenuItem>
              <MenuItem value="colaborador:batch_delete">colaborador:batch_delete</MenuItem>
              <MenuItem value="avatar:update">avatar:update</MenuItem>
              <MenuItem value="departamento:create">departamento:create</MenuItem>
              <MenuItem value="departamento:update">departamento:update</MenuItem>
              <MenuItem value="departamento:delete">departamento:delete</MenuItem>
              <MenuItem value="departamento:recount">departamento:recount</MenuItem>
              <MenuItem value="system:export">system:export</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="ent-label">Entidade</InputLabel>
            <Select labelId="ent-label" label="Entidade" value={entityType} onChange={(e) => setEntityType(String(e.target.value))}>
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="colaborador">colaborador</MenuItem>
              <MenuItem value="departamento">departamento</MenuItem>
              <MenuItem value="system">system</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={live} onChange={(e) => setLive(e.target.checked)} />}
            label="Tempo real"
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} disabled={live || loading} onClick={reload}>
            Recarregar
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv} disabled={filtrados.length === 0}>
            Exportar CSV
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <Chip label={`Mostrando: ${filtrados.length}`} variant="outlined" />
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Ação</TableCell>
              <TableCell>Entidade</TableCell>
              <TableCell>Ator</TableCell>
              <TableCell>Detalhes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Nenhum log</TableCell>
              </TableRow>
            ) : (
              filtrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatTs(l.createdAt)}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span><b>{l.entity?.type}</b></span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {l.entity?.name || "—"} {l.entity?.id ? `(${l.entity.id})` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{l.actor?.email || "—"}</span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>{l.actor?.uid || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(l.payload || {}, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
