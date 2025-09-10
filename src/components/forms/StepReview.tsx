import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Divider,
  Chip,
  Avatar,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/Grid"; // ✅ Grid v1

type ReviewProps = {
  data: any;
  onBack: () => void;
  onConfirm: () => void;
  /** opcional: usado para enviar avatar escolhido de volta ao StepForm */
  onChange?: (partial: any) => void;
};

function labelGenero(g?: "male" | "female") {
  if (g === "male") return "Masculino";
  if (g === "female") return "Feminino";
  return "-";
}

function labelNivel(n?: "junior" | "pleno" | "senior" | "gestor" | string) {
  if (n === "junior") return "Júnior";
  if (n === "pleno") return "Pleno";
  if (n === "senior") return "Sênior";
  if (n === "gestor") return "Gestor";
  return "-";
}

// preview do avatar (random por clique) respeitando nome+gênero, com cache-buster
function gerarUrlAvatarPreview(nome?: string, genero?: "male" | "female") {
  const seedRand = Math.random().toString(36).slice(2, 9);
  const seed = encodeURIComponent(
    `${nome || "user"}-${genero || "male"}-${seedRand}`
  );
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&gender=${
    genero || "male"
  }&v=${Date.now()}`;
}

// formata datas "YYYY-MM-DD" ou ISO → "dd/mm/aaaa"
function formatDateBR(input?: string) {
  if (!input) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
  }
  const dt = new Date(input);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, "0");
    const m2 = String(dt.getMonth() + 1).padStart(2, "0");
    const y2 = String(dt.getFullYear());
    return `${d}/${m2}/${y2}`;
  }
  return input;
}

// ----- máscaras/formatadores visuais -----
const onlyDigits = (s?: string) => (s || "").replace(/\D/g, "");

function maskCPF(value?: string) {
  const d = onlyDigits(value);
  if (d.length !== 11) return value || "-";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCEP(value?: string) {
  const d = onlyDigits(value);
  if (d.length !== 8) return value || "-";
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatCurrencyBR(v?: number | string) {
  if (v === undefined || v === null || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return String(v);
  }
}
// -----------------------------------------

export default function StepReview({
  data,
  onBack,
  onConfirm,
  onChange,
}: ReviewProps) {
  const genero: "male" | "female" =
    data?.genero === "female" ? "female" : "male";
  const nome = data?.nome || "user";

  // prévia começa já respeitando nome+gênero
  const initial = useMemo(
    () => gerarUrlAvatarPreview(nome, genero),
    [nome, genero]
  );
  const [preview, setPreview] = useState(initial);

  const regenerar = () => setPreview(gerarUrlAvatarPreview(nome, genero));

  const confirmar = () => {
    // envia o avatar escolhido & trava no cadastro final (se StepForm passar onChange)
    onChange?.({ avatar: preview, avatarLock: true, genero });
    onConfirm();
  };

  // rótulo de gestor responsável: tenta nome → email → id
  const gestorLabel: string =
    data?.nivel === "gestor"
      ? "— (colaborador é gestor)"
      : data?.gestorResponsavelNome ||
        data?.gestorResponsavel?.nome ||
        data?.gestorResponsavelEmail ||
        data?.gestorResponsavel?.email ||
        data?.gestorResponsavelId ||
        "-";

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <Typography variant="h6">Revisão dos dados</Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Avatar (preview)
          </Typography>
          <Avatar
            src={preview}
            alt={nome}
            sx={{ width: 48, height: 48, cursor: "pointer" }}
            title="Clique para gerar outro avatar"
            onClick={regenerar}
            aria-label="Gerar outro avatar"
          >
            {(nome || "?").charAt(0)}
          </Avatar>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={1}>
        {/* Pessoais */}
        <Grid item xs={12}>
          <Typography variant="subtitle2">Dados pessoais</Typography>
        </Grid>

        <Grid item xs={6}>Nome</Grid>
        <Grid item xs={6}>
          <b>{data?.nome || "-"}</b>
        </Grid>

        <Grid item xs={6}>CPF</Grid>
        <Grid item xs={6}>
          <b>{maskCPF(data?.cpf)}</b>
        </Grid>

        <Grid item xs={6}>E-mail</Grid>
        <Grid item xs={6}>
          <b>{data?.email || "-"}</b>
        </Grid>

        <Grid item xs={6}>Telefone</Grid>
        <Grid item xs={6}>
          <b>{data?.telefone || "-"}</b>
        </Grid>

        <Grid item xs={6}>Gênero</Grid>
        <Grid item xs={6}>
          <Chip
            size="small"
            label={labelGenero(data?.genero)}
            color={
              data?.genero === "male" || data?.genero === "female"
                ? "primary"
                : "default"
            }
            variant="outlined"
          />
        </Grid>

        {/* Endereço */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Endereço</Typography>
        </Grid>

        <Grid item xs={6}>CEP</Grid>
        <Grid item xs={6}>
          <b>{maskCEP(data?.cep)}</b>
        </Grid>

        <Grid item xs={6}>Rua</Grid>
        <Grid item xs={6}>
          <b>{data?.rua || "-"}</b>
        </Grid>

        <Grid item xs={6}>Número</Grid>
        <Grid item xs={6}>
          <b>{data?.numero || "-"}</b>
        </Grid>

        <Grid item xs={6}>Cidade</Grid>
        <Grid item xs={6}>
          <b>{data?.cidade || "-"}</b>
        </Grid>

        <Grid item xs={6}>Estado</Grid>
        <Grid item xs={6}>
          <b>{data?.estado || "-"}</b>
        </Grid>

        {/* Profissional */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Profissional</Typography>
        </Grid>

        <Grid item xs={6}>Departamento</Grid>
        <Grid item xs={6}>
          <Chip size="small" label={data?.departamento || "-"} variant="outlined" />
        </Grid>

        <Grid item xs={6}>Cargo</Grid>
        <Grid item xs={6}>
          <b>{data?.cargo || "-"}</b>
        </Grid>

        <Grid item xs={6}>Status</Grid>
        <Grid item xs={6}>
          <Chip
            size="small"
            label={data?.status || "indefinido"}
            color={data?.status === "ativo" ? "success" : "default"}
          />
        </Grid>

        <Grid item xs={6}>Admissão</Grid>
        <Grid item xs={6}>
          <b>{formatDateBR(data?.admissao)}</b>
        </Grid>

        <Grid item xs={6}>Nível</Grid>
        <Grid item xs={6}>
          <b>{labelNivel(data?.nivel)}</b>
        </Grid>

        <Grid item xs={6}>Gestor responsável</Grid>
        <Grid item xs={6}>
          <b>{gestorLabel}</b>
        </Grid>

        <Grid item xs={6}>Salário base</Grid>
        <Grid item xs={6}>
          <b>{formatCurrencyBR(data?.salarioBase)}</b>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button variant="outlined" onClick={onBack}>
          Voltar
        </Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={regenerar} aria-label="Gerar outro avatar">
            Gerar outro avatar
          </Button>
          <Button variant="contained" color="success" onClick={confirmar}>
            Confirmar e salvar
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
