import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, Button, Box } from "@mui/material";

const schema = z.object({
  cargo: z.string().min(1, "Cargo é obrigatório"),
  departamento: z.string().min(1, "Departamento é obrigatório"),
  admissao: z.string().min(1, "Data de admissão é obrigatória"),
});

type FormData = z.infer<typeof schema>;

interface StepThreeProps {
  onBack: () => void;
  onSubmitFinal: (data: FormData) => void;
  defaultValues?: FormData;
}

export const StepThree = ({
  onBack,
  onSubmitFinal,
  defaultValues,
}: StepThreeProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = (data: FormData) => {
    onSubmitFinal(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Cargo"
          {...register("cargo")}
          error={!!errors.cargo}
          helperText={errors.cargo?.message}
        />
        <TextField
          label="Departamento"
          {...register("departamento")}
          error={!!errors.departamento}
          helperText={errors.departamento?.message}
        />
        <TextField
          label="Data de admissão"
          type="date"
          {...register("admissao")}
          InputLabelProps={{ shrink: true }}
          error={!!errors.admissao}
          helperText={errors.admissao?.message}
        />

        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit" variant="contained" color="success">
            Finalizar
          </Button>
        </Box>
      </Box>
    </form>
  );
};
