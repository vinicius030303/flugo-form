import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { db } from "@/services/firebase";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { listarDepartamentos } from "@/services/departamentos";

type Colab = {
  id: string;
  nome?: string;
  departmentId?: string;
  departamento?: string;
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const BATCH_SAFE = 450;

export default function DevTools() {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<
    { id: string; nome?: string; legado: string; targetId: string; targetNome: string }[]
  >([]);
  const [counts, setCounts] = useState({ total: 0, legados: 0, migraveis: 0 });

  const hasPreview = preview.length > 0;

  async function runDryRun() {
    setBusy(true);
    try {
      const deps = await listarDepartamentos();
      const byNorm = new Map<string, { id: string; nome: string }>();
      deps.forEach((d) => d.id && byNorm.set(norm(d.nome || ""), { id: d.id, nome: d.nome || "" }));

      const snap = await getDocs(collection(db, "colaboradores"));
      const all: Colab[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const legados = all.filter((c) => !c.departmentId && (c.departamento || "").trim());
      const migraveis: typeof preview = [];

      legados.forEach((c) => {
        const legacyName = c.departamento!.trim();
        const target = byNorm.get(norm(legacyName));
        if (target) {
          migraveis.push({
            id: c.id,
            nome: c.nome,
            legado: legacyName,
            targetId: target.id,
            targetNome: target.nome,
          });
        }
      });

      setCounts({ total: all.length, legados: legados.length, migraveis: migraveis.length });
      setPreview(migraveis);
    } catch (e) {
      console.error(e);
      alert("Falha no dry-run. Veja o console.");
    } finally {
      setBusy(false);
    }
  }

  async function runMigrate() {
    if (preview.length === 0) {
      alert("Nada para migrar. Execute primeiro o Dry-run.");
      return;
    }
    if (!confirm(`Migrar ${preview.length} colaboradores?`)) return;

    setBusy(true);
    try {
      // Atualiza colaboradores em lotes
      for (let i = 0; i < preview.length; i += BATCH_SAFE) {
        const slice = preview.slice(i, i + BATCH_SAFE);
        const batch = writeBatch(db);
        slice.forEach((item) => {
          batch.update(doc(db, "colaboradores", item.id), {
            departmentId: item.targetId,
            departamento: item.targetNome, // mantemos compat
          });
        });
        await batch.commit();
      }

      alert("Migração concluída! Agora vá em Departamentos e clique em 'Recontar'.");
      setPreview([]);
    } catch (e) {
      console.error(e);
      alert("Falha na migração. Veja o console.");
    } finally {
      setBusy(false);
    }
  }

  const sample = useMemo(() => preview.slice(0, 12), [preview]);

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Ferramentas de Dados (Dev)
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Esta página ajuda a <b>migrar</b> colaboradores antigos que têm apenas o campo
        <code> departamento </code> (texto) para usarem também o <code>departmentId</code>.
        Após migrar, abra <b>Departamentos</b> e clique em <b>Recontar</b> para ajustar os totais gravados.
      </Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button variant="outlined" disabled={busy} onClick={runDryRun}>
            Dry-run (analisar)
          </Button>
          <Button variant="contained" color="success" disabled={busy || !hasPreview} onClick={runMigrate}>
            Migrar selecionáveis
          </Button>
          {busy && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={18} /> Processando…
            </Stack>
          )}
          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
          <Chip label={`Total: ${counts.total}`} />
          <Chip label={`Legados: ${counts.legados}`} color="warning" />
          <Chip label={`Migráveis: ${counts.migraveis}`} color="primary" />
        </Stack>
      </Paper>

      {hasPreview && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Amostra (primeiros {sample.length} de {preview.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Colaborador</TableCell>
                <TableCell>Departamento (legado)</TableCell>
                <TableCell>Departamento (alvo)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sample.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.nome || r.id}</TableCell>
                  <TableCell>{r.legado}</TableCell>
                  <TableCell>{r.targetNome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
