import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Avatar,
  Modal,
  TextField,
} from "@mui/material";
import { StepForm } from "../components/StepForm";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface Colaborador {
  nome: string;
  email: string;
  departamento: string;
  status: string;
  avatar?: string;
  avatarLock?: boolean;
  id?: string;
}

const nomesFemininos = [
  "ana", "maria", "joana", "fernanda", "carla", "amanda", "juliana", "patricia",
  "beatriz", "mariana", "larissa", "priscila", "camila", "aline", "raquel", "renata",
  "isabela", "gabriela", "leticia", "taina", "silvia", "roberta", "valeria", "luana",
  "heloisa", "debora", "marcela", "sandra", "flavia", "tatiana"
];

async function inferirGenero(nome: string): Promise<"male" | "female"> {
  const primeiroNome = nome.split(" ")[0].toLowerCase();
  if (nomesFemininos.includes(primeiroNome)) return "female";

  try {
    const response = await fetch(`https://api.genderize.io/?name=${primeiroNome}`);
    const data = await response.json();
    if (data.gender && data.probability > 0.8) {
      return data.gender;
    }
  } catch (error) {
    console.error("Erro ao chamar a API genderize.io:", error);
  }
  return "male";
}

async function gerarAvatar(nome: string, genero?: "male" | "female") {
  const gen = genero || await inferirGenero(nome);
  const seedUnica = encodeURIComponent(nome + "-" + Math.random().toString(36).substring(2, 9));
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seedUnica}&gender=${gen}`;
}

export const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [open, setOpen] = useState(false);
  const [orderBy, setOrderBy] = useState<string>('nome');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Estado para edição de avatar
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  const fetchData = async () => {
    const colRef = collection(db, "colaboradores");
    const snapshot = await getDocs(colRef);

    const data: Colaborador[] = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const colab = { id: docSnap.id, ...docSnap.data() } as Colaborador;

        if (!colab.avatar && colab.nome && !colab.avatarLock) {
          const novoAvatar = await gerarAvatar(colab.nome);
          colab.avatar = novoAvatar;
          const docRef = doc(db, "colaboradores", colab.id!);
          await updateDoc(docRef, { avatar: novoAvatar });
        }

        return colab;
      })
    );

    const sortedData = [...data].sort((a, b) => {
      const valueA = (a as any)['nome'];
      const valueB = (b as any)['nome'];
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    });

    setColaboradores(sortedData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    fetchData();
  };

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    const sortedData = [...colaboradores].sort((a, b) => {
      const valueA = (a as any)[property];
      const valueB = (b as any)[property];
      if (valueA < valueB) return isAsc ? -1 : 1;
      if (valueA > valueB) return isAsc ? 1 : -1;
      return 0;
    });
    setColaboradores(sortedData);
  };

  const sortIcon = (property: string) => {
    if (orderBy === property) {
      return order === 'asc'
        ? <ArrowUpwardIcon fontSize="small" />
        : <ArrowDownwardIcon fontSize="small" />;
    }
    return <ArrowDownwardIcon fontSize="small" sx={{ opacity: 0.3 }} />;
  };

  // Funções de escolha de avatar
  const abrirModalAvatar = (colab: Colaborador) => {
    setColaboradorSelecionado(colab);
    setCustomAvatarUrl(colab.avatar || "");
    setAvatarModalOpen(true);
  };

  const salvarAvatar = async (novoAvatar: string) => {
    if (!colaboradorSelecionado) return;
    const docRef = doc(db, "colaboradores", colaboradorSelecionado.id!);
    await updateDoc(docRef, { avatar: novoAvatar, avatarLock: true });
    setAvatarModalOpen(false);
    fetchData();
  };

  return (
    <Box sx={{ p: 2, width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" fontWeight={600}>
          Colaboradores
        </Typography>

        <Button variant="contained" color="success" onClick={handleOpen}>
          Novo Colaborador
        </Button>
      </Box>

      <Paper sx={{ width: "100%", p: 2 }}>
        <div className="table-container">
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('nome')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                    Nome {sortIcon('nome')}
                  </Box>
                </TableCell>
                <TableCell onClick={() => handleSort('email')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                    Email {sortIcon('email')}
                  </Box>
                </TableCell>
                <TableCell onClick={() => handleSort('departamento')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                    Departamento {sortIcon('departamento')}
                  </Box>
                </TableCell>
                <TableCell onClick={() => handleSort('status')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                    Status {sortIcon('status')}
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colaboradores.map((colab, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      src={colab?.avatar || undefined}
                      alt={colab?.nome || "Avatar"}
                      onClick={() => abrirModalAvatar(colab)}
                      sx={{ cursor: "pointer" }}
                    >
                      {colab?.nome ? colab.nome.charAt(0) : "?"}
                    </Avatar>
                    {colab?.nome || "—"}
                  </TableCell>
                  <TableCell>{colab?.email || "—"}</TableCell>
                  <TableCell>{colab?.departamento || "—"}</TableCell>
                  <TableCell>
                    {colab?.status?.trim() ? (
                      <span
                        style={{
                          backgroundColor:
                            colab.status.toLowerCase() === "ativo" ? "#16a34a33" : "#dc262633",
                          color: colab.status.toLowerCase() === "ativo" ? "#16a34a" : "#dc2626",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                        }}
                      >
                        {colab.status.charAt(0).toUpperCase() + colab.status.slice(1)}
                      </span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Paper>

      {/* Modal para escolher avatar */}
      <Modal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 4,
            width: "100%",
            maxWidth: 400,
            boxShadow: 24,
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          <Typography variant="h6">Escolher Avatar</Typography>
          <Button
            variant="outlined"
            onClick={async () => salvarAvatar(await gerarAvatar(colaboradorSelecionado!.nome, "male"))}
          >
            Gerar Masculino
          </Button>
          <Button
            variant="outlined"
            onClick={async () => salvarAvatar(await gerarAvatar(colaboradorSelecionado!.nome, "female"))}
          >
            Gerar Feminino
          </Button>
          <TextField
            label="URL personalizado"
            value={customAvatarUrl}
            onChange={(e) => setCustomAvatarUrl(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => salvarAvatar(customAvatarUrl)}
            disabled={!customAvatarUrl.trim()}
          >
            Salvar URL
          </Button>
        </Box>
      </Modal>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: 2,
            p: 4,
            width: "100%",
            maxWidth: 600,
            boxShadow: 24,
          }}
        >
          <StepForm onFinish={handleClose} />
        </Box>
      </Modal>
    </Box>
  );
};
