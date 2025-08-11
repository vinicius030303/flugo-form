import { useState, createContext, useMemo, useContext } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { Colaboradores } from "./pages/Colaboradores";
import { MainLayout } from "./components/MainLayout";

// Criar contexto para o tema
const ColorModeContext = createContext({ toggleColorMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

export const App = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () =>
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light")),
    }),
    []
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout>
          <Colaboradores />
        </MainLayout>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;