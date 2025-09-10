import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function NotFound() {
  return (
    <Box minHeight="100dvh" display="grid" sx={{ placeItems: "center", p: 2 }}>
      <Box textAlign="center">
        <Typography variant="h3" mb={1}>404</Typography>
        <Typography variant="h6" mb={3}>Página não encontrada</Typography>
        <Button component={RouterLink} to="/colaboradores" variant="contained">
          Voltar para colaboradores
        </Button>
      </Box>
    </Box>
  );
}
