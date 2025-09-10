import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  MenuItem,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

import {
  listarDepartamentos,
  criarDepartamento,
  type Departamento as Dept,
} from "@/services/departamentos";

import { db } from "@/services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// ===== Schema (compatível com versões antigas do zod) =====
const schema = z
  .object({
    cargo: z.string().min(1, "Cargo é obrigatório"),
    departmentId: z.string().min(1, "Departamento é obrigatório"),
    admissao: z.string().min(1, "Data de admissão é obrigatória"),
    nivel: z.enum(["junior", "pleno", "senior", "gestor"]),
    // pode vir vazio se nível = gestor
    gestorResponsavelId: z.string().optional().transform((v) => (v ?? "").trim()),
    // coage string/number → number e valida >= 0
    salarioBase: z.coerce.number().min(0, "Salário deve ser maior ou igual a 0"),
  })
  .refine(
    (val) => val.nivel === "gestor" || !!val.gestorResponsavelId,
    { path: ["gestorResponsavelId"], message: "Selecione um gestor responsável" }
  );

export type FormData = z.infer<typeof schema>;

interface StepThreeProps {
  onBack: () => void;
  onSubmitFinal: (data: FormData & { departamento?: string }) => void;
  defaultValues?: Partial<FormData & { departamento?: string }>;
}

const norm = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type GestorLite = {
  id: string;
  nome?: string;
  email?: string;
};

export const StepThree = ({ onBack, onSubmitFinal, defaultValues }: StepThreeProps) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    watch,
    formState: { errors, isSubmitted, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cargo: defaultValues?.cargo ?? "",
      departmentId: (defaultValues as any)?.departmentId ?? "",
      admissao: defaultValues?.admissao ?? "",
      nivel: (defaultValues as any)?.nivel ?? "junior",
      gestorResponsavelId: (defaultValues as any)?.gestorResponsavelId?.trim?.() ?? "",
      salarioBase:
        typeof (defaultValues as any)?.salarioBase === "number"
          ? (defaultValues as any)?.salarioBase
          : 0,
    },
    mode: "onSubmit",
  });

  const [departamentos, setDepartamentos] = useState<Dept[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);

  // diálogo "Novo departamento"
  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depNome, setDepNome] = useState("");
  const [savingDep, setSavingDep] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  // gestores
  const [gestores, setGestores] = useState<GestorLite[]>([]);
  const [loadingGestores, setLoadingGestores] = useState(false);

  const nivelAtual = watch("nivel");

  const depMap = useMemo(() => {
    const m = new Map<string, string>();
    departamentos.forEach((d) => d.id && m.set(d.id, d.nome || ""));
    return m;
  }, [departamentos]);

  async function carregarDepartamentos(): Promise<Dept[]> {
    setLoadingDeps(true);
    try {
      const data = await listarDepartamentos();
      const ordered = [...data].sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
      );
      setDepartamentos(ordered);
      return ordered;
    } finally {
      setLoadingDeps(false);
    }
  }

  async function carregarGestores(): Promise<GestorLite[]> {
    setLoadingGestores(true);
    try {
      const q = query(collection(db, "colaboradores"), where("nivel", "==", "gestor"));
      const snap = await getDocs(q);
      const items: GestorLite[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, nome: data?.nome || "", email: data?.email || "" };
      });
      items.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
      setGestores(items);
      return items;
    } catch {
      setGestores([]);
      return [];
    } finally {
      setLoadingGestores(false);
    }
  }

  useEffect(() => {
    (async () => {
      const list = await carregarDepartamentos();
      // compat: casar pelo nome quando vier apenas "departamento"
      const existingDeptName = (defaultValues as any)?.departamento?.trim();
      const currentId = (defaultValues as any)?.departmentId;
      if (!currentId && existingDeptName) {
        const found = list.find((d) => norm(d.nome || "") === norm(existingDeptName));
        if (found?.id) {
          setValue("departmentId", found.id, { shouldValidate: true });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pré-carrega gestores se o campo for necessário (nível != gestor)
  useEffect(() => {
    if (nivelAtual !== "gestor") {
      carregarGestores();
    } else {
      // se virou gestor, limpamos o gestorResponsavelId
      setValue("gestorResponsavelId", "", { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelAtual]);

  const onSubmit = (data: FormData) => {
    const deptName = depMap.get(data.departmentId) || (defaultValues as any)?.departamento || "";
    onSubmitFinal({ ...data, departamento: deptName });
  };

  const onSubmitError = (errs: FieldErrors<FormData>) => {
    const first = Object.keys(errs)[0] as keyof FormData | undefined;
    if (first) setFocus(first);
  };

  // === criação rápida de departamento ===
  const abrirNovoDep = () => {
    setDepNome("");
    setDepError(null);
    setDepDialogOpen(true);
  };

  const inserirLocalOrdenado = (novo: Dept & { id: string }) => {
    setDepartamentos((prev) => {
      const jaExiste = prev.some((d) => d.id === novo.id);
      if (jaExiste) return prev;
      const next = [...prev, novo];
      next.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" }));
      return next;
    });
  };

  const salvarNovoDep = async () => {
    const trimmed = depNome.trim();
    if (!trimmed) {
      setDepError("Informe o nome do departamento.");
      return;
    }

    // evita duplicado (case/acentos)
    const existe = departamentos.some((d) => norm(d.nome || "") === norm(trimmed));
    if (existe) {
      setDepError("Já existe um departamento com esse nome.");
      return;
    }

    try {
      setSavingDep(true);

      // cria e retorna o id
      const returnedId = (await criarDepartamento(trimmed)) as string | undefined;

      if (returnedId) {
        inserirLocalOrdenado({ id: returnedId, nome: trimmed });
        setValue("departmentId", returnedId, { shouldValidate: true, shouldDirty: true });
        setFocus("departmentId");
        setDepDialogOpen(false);
        return;
      }

      // Fallback: recarrega e tenta achar pelo nome
      let fresh = await carregarDepartamentos();
      if (!fresh.some((d) => norm(d.nome || "") === norm(trimmed))) {
        await new Promise((r) => setTimeout(r, 300));
        fresh = await carregarDepartamentos();
      }
      const escolhido = fresh.find((d) => norm(d.nome || "") === norm(trimmed) && d.id);
      if (escolhido?.id) {
        setValue("departmentId", escolhido.id, { shouldValidate: true, shouldDirty: true });
        setFocus("departmentId");
        setDepDialogOpen(false);
      } else {
        setDepError("Não foi possível obter o ID do novo departamento. Tente novamente.");
      }
    } catch {
      setDepError("Não foi possível criar o departamento.");
    } finally {
      setSavingDep(false);
    }
  };

  const topErrorMessage =
    errors.cargo?.message ||
    errors.departmentId?.message ||
    errors.admissao?.message ||
    errors.nivel?.message ||
    errors.gestorResponsavelId?.message ||
    errors.salarioBase?.message ||
    null;

  const departamentosComId = useMemo(
    () => departamentos.filter((d): d is Dept & { id: string } => Boolean(d.id)),
    [departamentos]
  );

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit, onSubmitError)}>
        <Box display="flex" flexDirection="column" gap={2}>
          {isSubmitted && topErrorMessage && (
            <Alert severity="error" role="alert" aria-live="assertive">
              {topErrorMessage}
            </Alert>
          )}

          <TextField
            label="Cargo"
            {...register("cargo")}
            error={!!errors.cargo}
            helperText={errors.cargo?.message || " "}
            fullWidth
            autoComplete="organization-title"
          />

          {/* Departamento via Autocomplete por ID + botão Novo */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
              <InputLabel shrink>Departamento</InputLabel>
              <Tooltip title="Criar um novo departamento">
                <span>
                  <Button size="small" variant="text" onClick={abrirNovoDep} disabled={loadingDeps || savingDep}>
                    Novo departamento
                  </Button>
                </span>
              </Tooltip>
            </Stack>

            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => {
                const current = departamentosComId.find((d) => d.id === field.value) || null;
                return (
                  <FormControl fullWidth error={!!errors.departmentId}>
                    <Autocomplete
                      disablePortal // evita “menu viajando” dentro do Modal
                      loading={loadingDeps}
                      options={departamentosComId}
                      getOptionLabel={(o) => o.nome || ""}
                      value={current}
                      onOpen={carregarDepartamentos}
                      onChange={(_, opt) => field.onChange(opt?.id ?? "")}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Selecione..."
                          error={!!errors.departmentId}
                          helperText={errors.departmentId?.message || " "}
                        />
                      )}
                      ListboxProps={{ style: { maxHeight: 260 } }}
                    />
                    <FormHelperText>{errors.departmentId?.message}</FormHelperText>
                  </FormControl>
                );
              }}
            />
          </Box>

          <TextField
            label="Data de admissão"
            type="date"
            {...register("admissao")}
            InputLabelProps={{ shrink: true }}
            error={!!errors.admissao}
            helperText={errors.admissao?.message || " "}
            fullWidth
            autoComplete="on"
          />

          {/* Nível hierárquico */}
          <TextField
            label="Nível hierárquico"
            select
            fullWidth
            defaultValue={(defaultValues as any)?.nivel ?? "junior"}
            {...register("nivel")}
            error={!!errors.nivel}
            helperText={errors.nivel?.message || " "}
          >
            <MenuItem value="junior">Júnior</MenuItem>
            <MenuItem value="pleno">Pleno</MenuItem>
            <MenuItem value="senior">Sênior</MenuItem>
            <MenuItem value="gestor">Gestor</MenuItem>
          </TextField>

          {/* Gestor responsável (apenas quando o colaborador não é gestor) */}
          {nivelAtual !== "gestor" && (
            <Controller
              name="gestorResponsavelId"
              control={control}
              render={({ field }) => {
                const current = gestores.find((g) => g.id === field.value) || null;
                return (
                  <Box>
                    <InputLabel shrink>Gestor responsável</InputLabel>
                    <Autocomplete
                      disablePortal
                      loading={loadingGestores}
                      options={gestores}
                      getOptionLabel={(o) => (o?.nome ? `${o.nome}${o.email ? ` (${o.email})` : ""}` : o?.email || "")}
                      value={current}
                      onOpen={carregarGestores}
                      onChange={(_, opt) => field.onChange(opt?.id ?? "")}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Selecione um gestor..."
                          error={!!errors.gestorResponsavelId}
                          helperText={
                            errors.gestorResponsavelId?.message ||
                            (!gestores.length
                              ? "Nenhum gestor encontrado — cadastre um colaborador com nível 'gestor'."
                              : " ")
                          }
                        />
                      )}
                      ListboxProps={{ style: { maxHeight: 260 } }}
                    />
                  </Box>
                );
              }}
            />
          )}

          {/* Salário base */}
          <TextField
            label="Salário base"
            type="number"
            inputProps={{ step: "0.01", min: 0 }}
            {...register("salarioBase", { valueAsNumber: true })}
            error={!!errors.salarioBase}
            helperText={errors.salarioBase?.message || " "}
            fullWidth
            autoComplete="off"
          />

          <Box display="flex" justifyContent="space-between">
            <Button variant="outlined" onClick={onBack}>
              Voltar
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={isSubmitting || loadingDeps || savingDep}>
              Finalizar
            </Button>
          </Box>
        </Box>
      </form>

      {/* Dialogo: Novo departamento */}
      <Dialog open={depDialogOpen} onClose={() => setDepDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo departamento</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nome"
            fullWidth
            value={depNome}
            onChange={(e) => {
              setDepNome(e.target.value);
              setDepError(null);
            }}
            error={!!depError}
            helperText={depError || " "}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={salvarNovoDep} disabled={savingDep}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StepThree;
