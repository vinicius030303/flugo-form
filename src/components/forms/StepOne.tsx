import type React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, Button, Box } from "@mui/material";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().min(11, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
});

type FormData = z.infer<typeof schema>;

interface StepOneProps {
  onNext: (data: FormData) => void;
  defaultValues?: FormData;
}

export const StepOne = ({ onNext, defaultValues }: StepOneProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = (data: FormData) => {
    onNext(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Nome completo"
          {...register("nome")}
          error={!!errors.nome}
          helperText={errors.nome?.message}
        />
        <TextField
          label="CPF"
          {...register("cpf")}
          error={!!errors.cpf}
          helperText={errors.cpf?.message}
        />
        <TextField
          label="E-mail"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <Button type="submit" variant="contained">
          Próximo
        </Button>
      </Box>
    </form>
  );
};
