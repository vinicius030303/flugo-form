import { useState, createContext, useMemo, useContext } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// CONTEXTO DE TEMA
type ColorModeCtx = { toggleColorMode: () => void };
const ColorModeContext = createContext<ColorModeCtx>({ toggleColorMode: () => {} });
export const useColorMode = () => useContext(ColorModeContext);

// PÁGINAS/COMPONENTES
import { Colaboradores } from "./pages/Colaboradores";
import { MainLayout } from "./components/MainLayout";
import Departamentos from "./pages/Departamentos";
import DevTools from "./pages/DevTools"; // ⬅️ NOVO

// AUTH / ROTAS
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

export const App = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rotas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route index element={<Navigate to="/colaboradores" replace />} />
                  <Route path="colaboradores" element={<Colaboradores />} />
                  <Route path="departamentos" element={<Departamentos />} />
                  <Route path="dev" element={<DevTools />} /> {/* ⬅️ NOVA ROTA oculta */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>

              {/* 404 pública */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;
