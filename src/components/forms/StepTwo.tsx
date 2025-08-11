import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, Button, Box } from "@mui/material";

const schema = z.object({
  cep: z.string().min(1, "CEP é obrigatório"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().min(1, "Estado é obrigatório"),
});

type FormData = z.infer<typeof schema>;

interface StepTwoProps {
  onNext: (data: FormData) => void;
  onBack: () => void;
  defaultValues?: FormData;
}

export const StepTwo = ({ onNext, onBack, defaultValues }: StepTwoProps) => {
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
          label="CEP"
          {...register("cep")}
          error={!!errors.cep}
          helperText={errors.cep?.message}
        />
        <TextField
          label="Rua"
          {...register("rua")}
          error={!!errors.rua}
          helperText={errors.rua?.message}
        />
        <TextField
          label="Número"
          {...register("numero")}
          error={!!errors.numero}
          helperText={errors.numero?.message}
        />
        <TextField
          label="Cidade"
          {...register("cidade")}
          error={!!errors.cidade}
          helperText={errors.cidade?.message}
        />
        <TextField
          label="Estado"
          {...register("estado")}
          error={!!errors.estado}
          helperText={errors.estado?.message}
        />
        <Box display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit" variant="contained">
            Próximo
          </Button>
        </Box>
      </Box>
    </form>
  );
};
