import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/Grid"; // ✅ Grid v1 (container/item)
import { db } from "@/services/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Departamento } from "@/services/departamentos";

type Genero = "male" | "female";

type Colaborador = {
  id?: string;
  nome?: string;
  status?: string;
  genero?: Genero;
  departmentId?: string; // modelo novo
  departamento?: string; // legado (nome)
};

const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Dashboard() {
  const [deps, setDeps] = useState<Departamento[]>([]);
  const [colabs, setColabs] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubDeps = onSnapshot(collection(db, "departamentos"), (snap) => {
      setDeps(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) =>
            (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
              sensitivity: "base",
            })
          )
      );
    });

    const unsubColabs = onSnapshot(collection(db, "colaboradores"), (snap) => {
      setColabs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });

    return () => {
      unsubDeps();
      unsubColabs();
    };
  }, []);

  const depNameById = useMemo(() => {
    const m = new Map<string, string>();
    deps.forEach((d) => d.id && m.set(d.id, d.nome || ""));
    return m;
  }, [deps]);

  const totals = useMemo(() => {
    const total = colabs.length;
    let ativos = 0,
      inativos = 0,
      male = 0,
      female = 0;
    for (const c of colabs) {
      const st = String(c.status || "").toLowerCase();
      if (st === "ativo") ativos++;
      else if (st === "inativo") inativos++;

      if (c.genero === "male") male++;
      else if (c.genero === "female") female++;
    }
    return { total, ativos, inativos, male, female };
  }, [colabs]);

  const porDepartamento = useMemo(() => {
    const counts = new Map<string, number>(); // chave = nome exibido
    for (const c of colabs) {
      let name = "—";
      if (c.departmentId) name = depNameById.get(c.departmentId) || "—";
      else if (c.departamento) name = c.departamento;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const arr = Array.from(counts, ([nome, count]) => ({ nome, count }));
    arr.sort((a, b) =>
      a.count === b.count
        ? norm(a.nome).localeCompare(norm(b.nome))
        : b.count - a.count
    );
    return arr;
  }, [colabs, depNameById]);

  const top5 = porDepartamento.slice(0, 5);

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" fontWeight={600}>
          Dashboard
        </Typography>
        {loading && <LinearProgress sx={{ width: 240 }} />}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Colaboradores
              </Typography>
              <Typography variant="h4">{totals.total}</Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  size="small"
                  label={`Ativos: ${totals.ativos}`}
                  color="success"
                />
                <Chip
                  size="small"
                  label={`Inativos: ${totals.inativos}`}
                  color="default"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Gênero
              </Typography>
              <Typography variant="h4">
                {totals.male + totals.female}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip size="small" label={`Masc: ${totals.male}`} color="primary" />
                <Chip size="small" label={`Fem: ${totals.female}`} color="secondary" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Departamentos (top 5)
              </Typography>
              <List dense>
                {top5.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="Sem dados ainda" />
                  </ListItem>
                ) : (
                  top5.map((d) => (
                    <ListItem key={d.nome}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ width: "100%" }}
                      >
                        <ListItemText primary={d.nome || "—"} />
                        <Chip size="small" label={d.count} />
                      </Stack>
                    </ListItem>
                  ))
                )}
              </List>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Total de departamentos: {deps.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Colaboradores por departamento
        </Typography>
        <Grid container spacing={1}>
          {porDepartamento.map((d) => (
            <Grid item xs={12} md={6} lg={4} key={d.nome}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography>{d.nome || "—"}</Typography>
                <Chip size="small" label={d.count} />
              </Stack>
            </Grid>
          ))}
          {porDepartamento.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">
                Nenhum colaborador cadastrado.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
