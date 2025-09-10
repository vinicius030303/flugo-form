import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

function mapFirebaseError(e: any): string {
  const code = e?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Credenciais inválidas. Verifique e-mail e senha.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Falha de rede. Verifique sua conexão.";
    case "auth/operation-not-allowed":
      return "Método de login não habilitado no Firebase (Email/Senha).";
    default:
      return e?.message || "Falha no login";
  }
}

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/colaboradores";

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (e: any) {
      setErr(mapFirebaseError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box minHeight="100dvh" display="grid" sx={{ placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 3, width: 380, maxWidth: "100%" }} elevation={3}>
        <Typography variant="h6" mb={2}>
          Entrar
        </Typography>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={onSubmit}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Senha"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShow((v) => !v)}
                    edge="end"
                    aria-label="mostrar senha"
                  >
                    {show ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitting || loading}
            endIcon={
              submitting || loading ? <CircularProgress size={18} /> : undefined
            }
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
