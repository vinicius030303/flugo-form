// ⬇️ Alterado: import React agora só como tipo, já que JSX não precisa dele, mas mantemos para evitar erro de tipos
import type React from "react";
import { useState } from "react";
import {
  Box,
  Step,
  StepLabel,
  Stepper,
  Paper,
} from "@mui/material";

import { StepOne } from "./forms/StepOne";
import { StepTwo } from "./forms/StepTwo";
import { StepThree } from "./forms/StepThree";

import { db } from "../services/firebase";
import { collection, addDoc } from "firebase/firestore";

const steps = ["Dados pessoais", "Endereço", "Profissional"];

export const StepForm = ({ onFinish }: { onFinish?: () => void }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<any>({});

  const next = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    // ⬇️ Tipagem ajustada para number, pois activeStep é number
    setActiveStep((prev: number) => prev + 1);
  };

  const back = () => setActiveStep((prev: number) => prev - 1);

  const submitAll = async (data: any) => {
    const finalData = {
      ...formData,
      ...data,
      status: "ativo", // ✅ status garantido no envio
    };

    try {
      await addDoc(collection(db, "colaboradores"), finalData);
      alert("Cadastro salvo com sucesso no Firebase!");
      console.log("✅ Dados enviados:", finalData);
      if (onFinish) onFinish();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar os dados.");
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: "auto", mt: 5 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box mt={4}>
        {activeStep === 0 && (
          <StepOne onNext={next} defaultValues={formData} />
        )}
        {activeStep === 1 && (
          <StepTwo onNext={next} onBack={back} defaultValues={formData} />
        )}
        {activeStep === 2 && (
          <StepThree
            onSubmitFinal={submitAll}
            onBack={back}
            defaultValues={formData}
          />
        )}
      </Box>
    </Paper>
  );
};
