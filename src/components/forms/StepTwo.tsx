import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, Button, Box, CircularProgress, Alert } from "@mui/material";

// remove máscara e deixa só dígitos
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// CEP válido = exatamente 8 dígitos
const schema = z.object({
  cep: z
    .string()
    .min(1, "CEP é obrigatório")
    .transform(onlyDigits)
    .refine((v) => v.length === 8, "CEP deve ter 8 dígitos"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().min(1, "Estado é obrigatório"),
});

type FormData = z.infer<typeof schema>;

interface StepTwoProps {
  onNext: (data: FormData) => void;
  onBack: () => void;
  defaultValues?: Partial<FormData>;
}

export const StepTwo = ({ onNext, onBack, defaultValues }: StepTwoProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setValue,
    watch,
    getValues,
    setFocus,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cep: defaultValues?.cep ?? "",
      rua: defaultValues?.rua ?? "",
      numero: defaultValues?.numero ?? "",
      cidade: defaultValues?.cidade ?? "",
      estado: defaultValues?.estado ?? "",
    },
    mode: "onSubmit",
  });

  // UI states para ViaCEP
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const lastFetchedCep = useRef<string>("");

  const cepValue = watch("cep");

  // Formata visualmente o campo CEP como 99999-999, sem alterar valor "real"
  const formatCepVisual = (raw: string) => {
    const digits = onlyDigits(raw).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Quando CEP tiver 8 dígitos → consulta ViaCEP e preenche rua/cidade/estado
  useEffect(() => {
    const digits = onlyDigits(cepValue);
    setCepErro(null);

    if (digits.length !== 8 || digits === lastFetchedCep.current) return;

    let aborted = false;
    setLoadingCep(true);

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((r) => r.json())
      .then((data) => {
        if (aborted) return;
        if (data?.erro) {
          setCepErro("CEP não encontrado");
          return;
        }
        // preenche se vierem valores
        if (data.logradouro) setValue("rua", data.logradouro);
        if (data.localidade) setValue("cidade", data.localidade);
        if (data.uf) setValue("estado", data.uf);
        lastFetchedCep.current = digits;
      })
      .catch(() => !aborted && setCepErro("Falha ao consultar CEP"))
      .finally(() => !aborted && setLoadingCep(false));

    return () => {
      aborted = true;
    };
  }, [cepValue, setValue]);

  const onSubmit = (data: FormData) => onNext(data);

  const onSubmitError = (errs: FieldErrors<FormData>) => {
    const first = Object.keys(errs)[0] as keyof FormData | undefined;
    if (first) setFocus(first);
  };

  // mensagem concentrada no topo (prioriza CEP → rua → número → cidade → estado)
  const topErrorMessage =
    errors.cep?.message ||
    errors.rua?.message ||
    errors.numero?.message ||
    errors.cidade?.message ||
    errors.estado?.message ||
    null;

  return (
    <form onSubmit={handleSubmit(onSubmit, onSubmitError)}>
      <Box display="flex" flexDirection="column" gap={2}>
        {isSubmitted && topErrorMessage && (
          <Alert severity="error" role="alert" aria-live="assertive">
            {topErrorMessage}
          </Alert>
        )}

        <TextField
          label="CEP"
          {...register("cep")}
          value={formatCepVisual(getValues("cep"))}
          onChange={(e) =>
            setValue("cep", e.target.value, { shouldValidate: false })
          }
          error={!!errors.cep || !!cepErro}
          helperText={errors.cep?.message || cepErro || " "}
          InputProps={{
            endAdornment: loadingCep ? <CircularProgress size={18} /> : null,
          }}
          inputProps={{ inputMode: "numeric" }}
          autoComplete="postal-code"
          // InputLabelProps={{ shrink: true }} // opcional
        />

        <TextField
          label="Rua"
          {...register("rua")}
          error={!!errors.rua}
          helperText={errors.rua?.message || " "}
          InputLabelProps={{ shrink: true }}
          autoComplete="address-line1"
        />

        <TextField
          label="Número"
          {...register("numero")}
          error={!!errors.numero}
          helperText={errors.numero?.message || " "}
          InputLabelProps={{ shrink: true }}
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          autoComplete="on"
        />

        <TextField
          label="Cidade"
          {...register("cidade")}
          error={!!errors.cidade}
          helperText={errors.cidade?.message || " "}
          InputLabelProps={{ shrink: true }} // evita sobrepor label
          autoComplete="address-level2"
        />

        <TextField
          label="Estado"
          {...register("estado")}
          onChange={(e) => setValue("estado", e.target.value.toUpperCase())}
          error={!!errors.estado}
          helperText={errors.estado?.message || " "}
          InputLabelProps={{ shrink: true }} // evita sobrepor label
          autoComplete="address-level1"
        />

        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit" variant="contained" disabled={loadingCep}>
            {loadingCep ? "Validando CEP..." : "Próximo"}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default StepTwo;
