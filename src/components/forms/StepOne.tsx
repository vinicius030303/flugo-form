import type React from "react";
import { Controller, useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TextField,
  Button,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from "@mui/material";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

type Genero = "male" | "female";
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// CPF
const cpfValido = (cpf: string) => {
  const c = onlyDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(c[i]) * (len + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
};

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().refine(cpfValido, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .refine((v) => {
      const d = onlyDigits(v);
      return d.length === 10 || d.length === 11;
    }, "Telefone inválido"),
  genero: z.union([z.literal("male"), z.literal("female")]),
});
type FormData = z.infer<typeof schema>;

interface StepOneProps {
  onNext: (data: FormData) => void;
  defaultValues?: Partial<FormData>;
}

export const StepOne = ({ onNext, defaultValues }: StepOneProps) => {
  const {
    register,
    handleSubmit,
    control,
    setFocus,
    formState: { errors, isSubmitted },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      cpf: defaultValues?.cpf ?? "",
      email: defaultValues?.email ?? "",
      telefone: defaultValues?.telefone ?? "",
      genero: (defaultValues?.genero as Genero) ?? "male",
    },
    mode: "onSubmit",
  });

  const onSubmit = (data: FormData) => onNext(data);
  const onSubmitError = (errs: FieldErrors<FormData>) => {
    const first = Object.keys(errs)[0] as keyof FormData | undefined;
    if (first) setFocus(first);
  };

  const topErrorMessage =
    errors.cpf?.message ||
    errors.telefone?.message ||
    errors.email?.message ||
    errors.nome?.message ||
    errors.genero?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit, onSubmitError)}>
      <Box display="flex" flexDirection="column" gap={2}>
        {isSubmitted && topErrorMessage && (
          <Alert severity="error">{topErrorMessage}</Alert>
        )}

        <TextField
          label="Nome completo"
          {...register("nome")}
          error={!!errors.nome}
          helperText={errors.nome?.message || " "}
          fullWidth
        />

        <Controller
          name="cpf"
          control={control}
          render={({ field }) => (
            <PatternFormat
              format="###.###.###-##"
              value={field.value || ""}
              onValueChange={(vals) => field.onChange(vals.formattedValue)}
              customInput={TextField}
              label="CPF"
              fullWidth
              error={!!errors.cpf}
              helperText={errors.cpf?.message || " "}
            />
          )}
        />

        <Controller
          name="telefone"
          control={control}
          render={({ field }) => (
            <PatternFormat
              format="(##) #####-####"
              value={field.value || ""}
              onValueChange={(vals) => field.onChange(vals.formattedValue)}
              customInput={TextField}
              label="Telefone"
              fullWidth
              error={!!errors.telefone}
              helperText={errors.telefone?.message || " "}
            />
          )}
        />

        <TextField
          label="E-mail"
          type="email"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message || " "}
          fullWidth
        />

        {/* GENERO agora via Controller */}
        <FormControl error={!!errors.genero}>
          <FormLabel id="genero-label">Gênero</FormLabel>
          <Controller
            name="genero"
            control={control}
            render={({ field }) => (
              <RadioGroup row aria-labelledby="genero-label" {...field}>
                <FormControlLabel value="male" control={<Radio />} label="Masculino" />
                <FormControlLabel value="female" control={<Radio />} label="Feminino" />
              </RadioGroup>
            )}
          />
        </FormControl>

        <Button type="submit" variant="contained">
          Próximo
        </Button>
      </Box>
    </form>
  );
};

export default StepOne;
