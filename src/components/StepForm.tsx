import { useState } from "react";
import {
  Paper,
  Stepper,
  Step,
  StepLabel,
  Box,
  Snackbar,
  Alert,
  type AlertColor,
} from "@mui/material";
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc,
  increment,
  getDoc, // pega o nome do depto pelo ID quando necessário
} from "firebase/firestore";
import { db } from "../services/firebase";
import { StepOne } from "./forms/StepOne";
import { StepTwo } from "./forms/StepTwo";
import { StepThree } from "./forms/StepThree";
import StepReview from "./forms/StepReview";
import { useAuth } from "@/contexts/AuthContext";
import { logEvent } from "@/services/logs";

const steps = ["Dados pessoais", "Endereço", "Profissional", "Revisão"];

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor;
};

export const StepForm = ({ onFinish }: { onFinish?: () => void }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<any>({ status: "ativo" });

  const { user } = useAuth();

  const [snack, setSnack] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const showSnack = (message: string, severity: AlertColor = "success") =>
    setSnack({ open: true, message, severity });

  const handleSnackClose = () => setSnack((s) => ({ ...s, open: false }));

  const next = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setActiveStep((prev) => prev + 1);
    try {
      const el = document.querySelector('[role="dialog"]') || window;
      // @ts-ignore
      el.scrollTo?.({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const back = () => {
    setActiveStep((prev) => prev - 1);
    try {
      const el = document.querySelector('[role="dialog"]') || window;
      // @ts-ignore
      el.scrollTo?.({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const goToReviewFromStep3 = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setActiveStep(3);
  };

  const mergeFromReview = (partial: any) => {
    setFormData((prev: any) => ({ ...prev, ...partial }));
  };

  const submitAll = async () => {
    try {
      // normalizações
      const depId: string | undefined =
        (formData?.departmentId && String(formData.departmentId)) || undefined;

      let departamentoNome: string = formData?.departamento || "";
      if (depId && !departamentoNome) {
        const depSnap = await getDoc(doc(db, "departamentos", depId));
        departamentoNome = String(depSnap.data()?.nome || "");
      }

      const nivel: "junior" | "pleno" | "senior" | "gestor" =
        (formData?.nivel as any) || "junior";

      const gestorResponsavelId: string | null =
        nivel === "gestor"
          ? null
          : (formData?.gestorResponsavelId?.trim?.() || null);

      const salarioBaseNum =
        typeof formData?.salarioBase === "number"
          ? formData.salarioBase
          : Number(formData?.salarioBase ?? 0);

      // payload final
      const payload = {
        ...formData, // mantém demais campos preenchidos nas etapas
        departmentId: depId || null,
        departamento: (departamentoNome || "").trim() || null,
        nivel,
        gestorResponsavelId,
        salarioBase: Number.isFinite(salarioBaseNum) && salarioBaseNum >= 0 ? salarioBaseNum : 0,
        status: formData.status ?? "ativo",
        createdAt: serverTimestamp(),
      };

      // grava tudo em batch atômico (criação + ajuste do contador)
      const batch = writeBatch(db);
      const colabRef = doc(collection(db, "colaboradores")); // gera ID
      batch.set(colabRef, payload);

      if (depId) {
        batch.update(doc(db, "departamentos", depId), {
          colaboradoresCount: increment(+1),
        });
      }

      await batch.commit();

      // log
      await logEvent({
        action: "colaborador:create",
        actor: { uid: user?.uid, email: user?.email },
        entity: { type: "colaborador", id: colabRef.id, name: formData?.nome || "" },
        payload: {
          departmentId: depId || null,
          status: payload.status,
          nivel: payload.nivel,
          gestorResponsavelId: payload.gestorResponsavelId,
          salarioBase: payload.salarioBase,
        },
      });

      showSnack("Cadastro salvo com sucesso!", "success");
      onFinish?.();
    } catch (e) {
      console.error(e);
      showSnack("Erro ao salvar cadastro. Tente novamente.", "error");
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 720, mx: "auto", mt: 5 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, idx) => (
          <Step key={label}>
            <StepLabel icon={idx + 1}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box mt={4}>
        {activeStep === 0 && <StepOne onNext={next} defaultValues={formData} />}

        {activeStep === 1 && (
          <StepTwo onNext={next} onBack={back} defaultValues={formData} />
        )}

        {activeStep === 2 && (
          <StepThree
            onSubmitFinal={goToReviewFromStep3}
            onBack={back}
            defaultValues={formData}
          />
        )}

        {activeStep === 3 && (
          <StepReview
            data={formData}
            onBack={back}
            onConfirm={submitAll}
            onChange={mergeFromReview}
          />
        )}
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default StepForm;
