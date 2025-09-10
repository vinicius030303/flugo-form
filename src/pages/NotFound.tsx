import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => navigate(user ? "/colaboradores" : "/login", { replace: true });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 520 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h3" fontWeight={700}>
            404
          </Typography>
          <Typography variant="h6">Página não encontrada</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            O recurso que você tentou acessar não existe ou foi movido.
          </Typography>
          <Button variant="contained" onClick={goHome}>
            Voltar para {user ? "Colaboradores" : "Login"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
