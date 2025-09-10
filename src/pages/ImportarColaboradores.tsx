import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Chip,
  LinearProgress,
} from "@mui/material";
import { parseCSV, toObjectRow } from "@/utils/csv";
import { db } from "@/services/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { listarDepartamentos, criarDepartamento, type Departamento } from "@/services/departamentos";

// Campos suportados (case-insensitive):
// nome*, email*, status (ativo|inativo), genero (male|female),
// departmentId, departamento (nome), cpf, telefone, cargo, admissao (YYYY-MM-DD)
type Row = {
  nome: string;
  email: string;
  status?: string;
  genero?: "male" | "female";
  departmentId?: string;
  departamento?: string;
  cpf?: string;
  telefone?: string;
  cargo?: string;
  admissao?: string;
};

type PreviewRow = Row & {
  _ok: boolean;
  _errors: string[];
  _resolvedDeptId?: string;
  _resolvedDeptName?: string;
};

const norm = (s?: string) =>
  String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function ImportarColaboradores() {
  const [text, setText] = useState<string>("");
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [createMissingDeps, setCreateMissingDeps] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string>("");

  // carrega departments para resolução por nome
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await listarDepartamentos();
        list.sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
        );
        setDepartamentos(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const depIdByNormName = useMemo(() => {
    const m = new Map<string, string>();
    departamentos.forEach((d) => d.id && m.set(norm(d.nome || ""), d.id));
    return m;
  }, [departamentos]);

  const depNameById = useMemo(() => {
    const m = new Map<string, string>();
    departamentos.forEach((d) => d.id && m.set(d.id, d.nome || ""));
    return m;
  }, [departamentos]);

  const parseAndPreview = () => {
    setResultMsg("");
    const { header: h, rows: raw } = parseCSV(text);
    if (!h.length || !raw.length) {
      setHeader([]); setRows([]); return;
    }

    // normaliza header para lower-case
    const headerLower = h.map((x) => norm(x));
    setHeader(h);

    const out: PreviewRow[] = [];
    for (const r of raw) {
      const obj = toObjectRow(headerLower, r);
      const row: Row = {
        nome: obj["nome"] || "",
        email: obj["email"] || "",
        status: obj["status"] || "",
        genero: (obj["genero"] as any) || "",
        departmentId: obj["departmentid"] || "",
        departamento: obj["departamento"] || "",
        cpf: obj["cpf"] || "",
        telefone: obj["telefone"] || "",
        cargo: obj["cargo"] || "",
        admissao: obj["admissao"] || "",
      };

      const errors: string[] = [];

      if (!row.nome) errors.push("nome obrigatório");
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("email inválido/obrigatório");

      const st = norm(row.status);
      if (st && st !== "ativo" && st !== "inativo") errors.push("status deve ser ativo|inativo");

      const gen = row.genero ? String(row.genero) : "";
      if (gen && gen !== "male" && gen !== "female") errors.push("gênero deve ser male|female");

      // resolve departamento
      let resolvedId = row.departmentId || "";
      let resolvedName = "";
      if (resolvedId) {
        resolvedName = depNameById.get(resolvedId) || "";
      } else if (row.departamento) {
        const idByName = depIdByNormName.get(norm(row.departamento));
        if (idByName) {
          resolvedId = idByName;
          resolvedName = depNameById.get(idByName) || row.departamento;
        } else if (!createMissingDeps) {
          errors.push(`departamento "${row.departamento}" não existe`);
        }
      }

      out.push({
        ...row,
        status: st || "ativo",
        genero: (gen as any) || "male",
        _resolvedDeptId: resolvedId || undefined,
        _resolvedDeptName: resolvedName || (row.departamento || undefined),
        _ok: errors.length === 0,
        _errors: errors,
      });
    }

    setRows(out);
  };

  const anyOk = rows.some((r) => r._ok);
  const errorsCount = rows.reduce((acc, r) => acc + (r._errors.length ? 1 : 0), 0);

  const importNow = async () => {
    setResultMsg("");
    if (!anyOk) {
      setResultMsg("Nenhuma linha válida para importar.");
      return;
    }

    setImporting(true);
    try {
      // cria departamentos faltantes, se habilitado
      const needCreate = new Set<string>();
      if (createMissingDeps) {
        for (const r of rows) {
          if (!r._ok) continue;
          if (!r._resolvedDeptId && r._resolvedDeptName) {
            needCreate.add(r._resolvedDeptName);
          }
        }
      }

      if (needCreate.size) {
        for (const name of needCreate) {
          const id = await criarDepartamento(name);
          // atualiza mapas locais
          departamentos.push({ id, nome: name });
          depIdByNormName.set(norm(name), id);
          depNameById.set(id, name);
        }
      }

      // resolve novamente IDs (caso tenhamos criado)
      const toImport = rows
        .filter((r) => r._ok)
        .map((r) => {
          let deptId = r._resolvedDeptId;
          let deptName = r._resolvedDeptName || "";
          if (!deptId && deptName) {
            const id = depIdByNormName.get(norm(deptName));
            if (id) {
              deptId = id;
            }
          }
          // payload do colaborador
          return {
            nome: r.nome,
            email: r.email,
            status: r.status || "ativo",
            genero: (r.genero as "male" | "female") || "male",
            departmentId: deptId || undefined,
            departamento: deptName || undefined, // compat/fallback
            cpf: r.cpf || undefined,
            telefone: r.telefone || undefined,
            cargo: r.cargo || undefined,
            admissao: r.admissao || undefined,
          };
        });

      // chunk em batches (<= 450 writes para folga)
      const chunkSize = 450;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const slice = toImport.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        // add colaborador (precisa addDoc → não entra no batch),
        // então aqui optamos por inserir 1 a 1 via addDoc e, no final de cada chunk,
        // fazemos os ajustes necessários (nenhum ajuste obrigatório aqui, pois
        // o contador do departamento é mantido pela tela de cadastro/edição).
        // Se quiser ajustar contador aqui também, a gente soma por deptId e faz updates.
        const createdRefs: { departmentId?: string }[] = [];
        for (const docData of slice) {
          await addDoc(collection(db, "colaboradores"), docData as any);
          createdRefs.push({ departmentId: docData.departmentId });
        }

        // agrupa por departmentId para (opcional) ajustar contadores agora
        // (caso você já esteja usando os contadores, é legal subir junto)
        const byDep = new Map<string, number>();
        for (const r of createdRefs) {
          if (r.departmentId) {
            byDep.set(r.departmentId, (byDep.get(r.departmentId) || 0) + 1);
          }
        }
        byDep.forEach((delta, depId) => {
          batch.update(doc(db, "departamentos", depId), { colaboradoresCount: (window as any).firebase?.firestore?.FieldValue?.increment
              ? (window as any).firebase.firestore.FieldValue.increment(delta)
              : ({} as any) // fallback (em tempo real já corrige)
          });
        });

        // Se increment não estiver acessível via window (setup diferente), o onSnapshot do Dashboard/Departamentos já reflete.
        await batch.commit();
      }

      setResultMsg(`Importação concluída! Linhas válidas: ${toImport.length}${errorsCount ? `, com ${errorsCount} linha(s) com erro ignoradas.` : ""}`);
      setRows([]);
      setText("");
    } catch (e) {
      console.error(e);
      setResultMsg("Falha ao importar. Verifique o arquivo e tente novamente.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight={600}>Importar Colaboradores (CSV)</Typography>
        {loading && <LinearProgress sx={{ width: 240 }} />}
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>1) Cole o conteúdo do CSV (com cabeçalho) ou arraste o arquivo e cole o texto aqui</Typography>
        <TextField
          placeholder={`Exemplo de cabeçalho:\nnome;email;status;genero;departmentId;departamento;cpf;telefone;cargo;admissao\n`}
          multiline
          minRows={8}
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Stack direction="row" spacing={1} mt={2} alignItems="center">
          <Checkbox
            checked={createMissingDeps}
            onChange={(e) => setCreateMissingDeps(e.target.checked)}
          />
          <Typography>Criar departamentos inexistentes automaticamente</Typography>
        </Stack>
        <Stack direction="row" spacing={1} mt={1}>
          <Button variant="contained" onClick={parseAndPreview} disabled={!text.trim()}>
            Pré-visualizar
          </Button>
          <Button variant="text" onClick={() => { setText(""); setRows([]); setHeader([]); }}>
            Limpar
          </Button>
        </Stack>
      </Paper>

      {rows.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            2) Prévia ({rows.length} linha{rows.length > 1 ? "s" : ""}) — válidas:{" "}
            <b>{rows.filter((r) => r._ok).length}</b>, com erro: <b>{errorsCount}</b>
          </Typography>

          <div style={{ overflow: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>OK</TableCell>
                  <TableCell>Erros</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Gênero</TableCell>
                  <TableCell>Dept (ID)</TableCell>
                  <TableCell>Dept (Nome)</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Cargo</TableCell>
                  <TableCell>Admissão</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r._ok ? "OK" : "Erro"}
                        color={r._ok ? "success" : "error"}
                        variant={r._ok ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      {r._errors.length ? (
                        <Alert severity="error" variant="outlined">
                          {r._errors.join("; ")}
                        </Alert>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{r.nome}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.status || "ativo"}</TableCell>
                    <TableCell>{r.genero || "male"}</TableCell>
                    <TableCell>{r._resolvedDeptId || "—"}</TableCell>
                    <TableCell>{r._resolvedDeptName || r.departamento || "—"}</TableCell>
                    <TableCell>{r.cpf || "—"}</TableCell>
                    <TableCell>{r.telefone || "—"}</TableCell>
                    <TableCell>{r.cargo || "—"}</TableCell>
                    <TableCell>{r.admissao || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Stack direction="row" spacing={1} mt={2}>
            <Button
              variant="contained"
              color="success"
              onClick={importNow}
              disabled={!rows.some((r) => r._ok) || importing}
            >
              Importar agora
            </Button>
            <Button variant="text" onClick={() => { setRows([]); setHeader([]); }}>
              Limpar prévia
            </Button>
          </Stack>

          {resultMsg && <Alert sx={{ mt: 2 }} severity="info">{resultMsg}</Alert>}
        </Paper>
      )}
    </Box>
  );
}