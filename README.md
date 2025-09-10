<h1 align="center">Flugo Form</h1>
<p align="center">
  Formulário Multi-Step para gestão de colaboradores — desenvolvido com <strong>React</strong>, <strong>TypeScript</strong> e <strong>Material UI</strong>, integrado ao <strong>Firebase</strong>.
</p>

---

##  Sobre o projeto

O **Flugo Form** é um sistema de cadastro e gerenciamento de colaboradores, desenvolvido como parte de um teste técnico.  
O sistema permite registrar colaboradores via formulário multi-etapas, listar dados com ordenação dinâmica e armazenar todas as informações no **Firebase Firestore**.

---

##  Funcionalidades

- ✅ **Formulário multi-step (Stepper MUI)**: **Pessoais → Endereço → Profissional → Revisão**
- ✅ **Validação por etapa** (React Hook Form + Zod) com bloqueio de avanço em caso de erro
- ✅ **Máscaras**: **CPF** (###.###.###-##) com **validação forte** (dígitos verificadores), **Telefone** ((##) #####-####) e **CEP** (#####-###)
- ✅ **Integração com Firebase Firestore** para persistência de dados
- ✅ **Listagem com ordenação** clicável nas colunas
- ✅ **Avatares automáticos** via [DiceBear API](https://www.dicebear.com/)
- ✅ **Layout responsivo**, seguindo o protótipo recebido
- ✅ **Modal centralizado** para criar novos colaboradores
- ✅ **Fallback inteligente** para inicial do nome nos avatares
- ✅ **Código em TypeScript**, garantindo tipagem e segurança


---

## Atualizações (set/2025)

- **Stepper linear** com 4 etapas e **Revisão** final antes do envio
- **Validação por etapa** (RHF + Zod) e bloqueio de avanço quando houver erros
- **Máscaras** aplicadas a CPF/Telefone/CEP e **validação forte de CPF**
- **Feedback de sucesso/erro** no envio ao Firebase

---

##  Tecnologias utilizadas

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Material UI](https://img.shields.io/badge/MUI-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---


## Conformidade com o desafio

| Requisito                                        | Como foi atendido                                                                 
|--------------------------------------------------|-----------------------------------------------------------------------------------
| Formulário multi-step (Stepper MUI)              | **4 etapas:** Pessoais → Endereço → Profissional → **Revisão**                    
| Validações **entre as etapas**                   | RHF + Zod; **botão Próximo** só avança se a etapa estiver válida                  
| Feedback entre etapas                            | Mensagens de erro nos campos (+ alerta de etapa opcional)                         
| **Navegação linear** (sem pular passos)          | `StepLabel` sem clique; steps futuros `disabled`                                   
| **Revisão** antes do submit                      | `StepReview` mostrando todos os campos                                             
| Todos os campos **required**                     | Zod (`min`, `refine`), máscaras; CPF com dígitos verificadores                     
| Persistência no **Firebase**                     | `addDoc` em `colaboradores` + feedback de sucesso/erro                             
| **Deploy** público                               | Vercel com `VITE_*` configuradas                                                   

---


##  Estrutura de pastas

.
├── public/  
├── src/  
│     ├── assets/           # imagens, ícones, etc.  
│     ├── components/       # componentes reutilizáveis (UI)  
│     ├── pages/            # páginas (ex.: Login, Colaboradores, Departamentos, 404)  
│     ├── routes/           # rotas e guards (ex.: ProtectedRoute)  
│     ├── services/         # integrações (ex.: firebase.ts, firestore, auth)  
│     ├── hooks/            # hooks customizados  
│     ├── context/          # contexto global (ex.: AuthContext)  
│     ├── utils/            # helpers/formatadores/validadores  
│     ├── types/            # Tipos/Interfaces TypeScript  
│     └── styles/           # estilos globais/tema  
├──  .editorconfig
├──  .env                   # variáveis de ambiente (Vite + Firebase)  
├──  .eslintignore  
├──  .eslintrc.cjs  
├──  .gitignore  
├──  .prettierignore  
├──  .prettierrc  
├──  firestore.rules         # regras do Firestore  
├──  index.html  
├──  package.json  
├──  package-lock.json  
├──  README.md  
├──  tsconfig.app.json  
├──  tsconfig.json  
├──  tsconfig.node.json  
├──  vite-env.d.ts  
└──  vite.config.ts  


---

##  Como rodar localmente

```bash
# Clonar repositório
git clone https://github.com/vinicius030303/flugo-form

# Entrar na pasta
cd flugo-form

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
```

A aplicação estará disponível em: http://localhost:5173


---

## Parte 2 — Funcionalidades Adicionadas

###  Objetivo
Adicionar autenticação com **Firebase Authentication (JWT)**, proteger rotas, criar tela de **Login** e página **404**, e evoluir o módulo de **Colaboradores** (edição, exclusão individual e em massa, filtros por nome/email/departamento, novos campos profissionais) e o módulo de **Departamentos** (CRUD completo, gestor responsável e transferência de colaboradores entre departamentos).

---

###  Requisitos Atendidos (Resumo)
- **Auth & Proteção de Rotas**
  - Login com Firebase Authentication (Email/Senha).
  - Persistência do token do usuário e **guard** de rotas (somente autenticado acessa páginas internas).
  - **Página 404** personalizada e redirecionamentos consistentes.
- **Colaboradores**
  - **Edição** de dados de cada colaborador (tela/modal de edição).
  - **Exclusão** individual e **em massa** (seleção por checkbox + ação em lote).
  - **Filtros** por **nome**, **email** e **departamento** (busca rápida e combinável).
  - **Campos profissionais** adicionados no cadastro/edição:
    - **Cargo**
    - **Data de admissão**
    - **Nível hierárquico** (Júnior, Pleno, Sênior, **Gestor**)
    - **Gestor responsável** (referência a um colaborador já cadastrado com nível **Gestor**)
    - **Salário base**
- **Departamentos**
  - Página de **listagem** (com busca e paginação, se aplicável).
  - **Cadastro**, **edição** e **exclusão** de departamentos.
  - O departamento possui: **Nome**, **Colaboradores** e **Gestor responsável** (um colaborador com nível **Gestor**).
  - Na **edição** do departamento:
    - Visualização/gerenciamento da **lista de colaboradores** do depto.
    - Possibilidade de **adicionar** colaboradores (já existentes) ao depto.
    - **Transferência** de colaboradores entre departamentos (também possível a partir da edição do próprio colaborador).
  - **Regra**: colaborador **NÃO PODE** ficar sem departamento (validações impedem estado inválido).

---

###  Fluxos de Usuário (Principais)

- **Login:**
  1. Usuário acessa `/login`, informa email/senha.
  2. Ao autenticar, é redirecionado para **/colaboradores** (ou rota privada definida).
  3. Se tentar acessar rota protegida sem estar logado, é enviado para `/login`.

- **Colaboradores:**
  - **Criar**: botão “Novo colaborador” → stepper de cadastro → inclui etapa **Profissional** com os novos campos (cargo, admissão, nível, gestor, salário).
  - **Editar**: ação na tabela abre formulário com dados preenchidos (inclusive os campos profissionais).
  - **Excluir (individual)**: ação na linha com confirmação.
  - **Excluir (em massa)**: marcar várias linhas (checkbox) → ação de excluir selecionados com confirmação.
  - **Filtrar**: por **nome**, **email** e **departamento** (inputs/select na própria listagem).

- **Departamentos:**
  - **Listar**: `/departamentos` exibe todos os departamentos (nome, gestor, contagem de colaboradores).
  - **Criar**: formulário para nome + definir **gestor responsável** (+ opcionalmente vincular colaboradores).
  - **Editar**: alterar nome/gestor; **adicionar/remover** colaboradores deste departamento; **transferir** colaboradores entre departamentos.
  - **Excluir**: apenas se não violar a regra de “colaborador sem departamento”; o app guia a **transferência** prévia quando necessário.

- **404 / Redirecionamentos:**
  - Rotas inexistentes → página **404**.
  - Usuário logado que acessa `/login` → redirecionamento para área interna (evitar tela de login para usuários autenticados, se configurado).

---

### ️ Modelo de Dados (Firestore – sugestão de estrutura)

- **`colaboradores`**
  ```ts
  {
    id: string,
    nome: string,
    email: string,
    cpf: string,
    telefone?: string,
    endereco?: { cep: string; cidade: string; uf: string; logradouro: string; numero?: string; complemento?: string; },
    departamentoId: string,          // referência ao departamento atual
    cargo: string,
    dataAdmissao: string,            // ISO (yyyy-mm-dd)
    nivel: 'junior' | 'pleno' | 'senior' | 'gestor',
    gestorId?: string,               // id de um colaborador com nivel = 'gestor'
    salarioBase: number,
    createdAt: number,
    updatedAt: number
  }
  ```
- **`departamentos`**
  ```ts
  {
    id: string,
    nome: string,
    gestorId?: string,               // colaborador com nivel = 'gestor'
    colaboradoresIds: string[],      // lista de ids de colaboradores neste departamento
    createdAt: number,
    updatedAt: number
  }
  ```

> Observações de integridade:  
> • Transferências mantêm `departamentoId` do colaborador sincronizado com `colaboradoresIds` do departamento.  
> • Ao excluir um departamento, o app exige **transferir** os colaboradores antes (prevenindo “sem departamento”).  
> • O campo **gestorId** valida se o colaborador escolhido tem `nivel = 'gestor'`.

---

###  Autenticação & Proteção de Rotas

- **Firebase Authentication (Email/Senha)**.
- Salvamos/checamos o token do usuário para proteger rotas privadas (ex.: HOC `ProtectedRoute` ou guard no router).
- **Logout** invalida a sessão local e volta ao `/login`.
- **404** customizada e rotas padrão:
  - `/login` – público  
  - `/` → redireciona para `/colaboradores` (se autenticado)  
  - `/colaboradores` – privado  
  - `/departamentos` – privado  
  - `*` → 404

---

### ️ Como Rodar (atualizado)

```bash
# 1) Instalar deps
npm install

# 2) Criar .env na raiz com:
VITE_FIREBASE_API_KEY="SEU_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="SEU_PROJECT.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="SEU_PROJECT"
VITE_FIREBASE_STORAGE_BUCKET="SEU_PROJECT.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="SEU_SENDER"
VITE_FIREBASE_APP_ID="SEU_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXX"

# 3) Rodar
npm run dev
```

**Credenciais de teste para avaliação (repositório privado):**
- **Email:** `admin@teste.com`
- **Senha:** `123456`

> **Deploy (Vercel):** configure as mesmas variáveis `VITE_*` (Settings → Environment Variables) e redeploy.

---

###  Scripts úteis
- `npm run dev` – desenvolvimento  
- `npm run build` – produção  
- `npm run preview` – preview local  
- `npm run lint` – lint  
- `npm run test` – testes (se adicionados)

---

###  Checklist de QA
- [ ] Login e logout funcionando; rotas privadas inacessíveis sem autenticação  
- [ ] Página 404 ativa para rotas inválidas  
- [ ] CRUD de colaboradores ok (criar/editar/excluir individual)  
- [ ] Exclusão em massa de colaboradores com confirmação  
- [ ] Filtros por nome, email e departamento funcionando em conjunto  
- [ ] Campos profissionais gravando corretamente (cargo, admissão, nível, gestor, salário)  
- [ ] CRUD de departamentos com gestor responsável  
- [ ] Adicionar/remover **colaboradores** ao departamento (sem duplicar)  
- [ ] **Transferência** entre departamentos preservando integridade  
- [ ] Nenhum colaborador fica sem departamento  
- [ ] Responsividade mobile/desktop sem cortar conteúdo  
- [ ] Console sem erros e sem warnings críticos

---


##  Links

- **Deploy na Vercel**: [https://flugo-form.vercel.app](https://flugo-form.vercel.app)
- **Protótipo no Figma**: [Link do protótipo](https://www.figma.com/proto/r7xOsboMOQlMpEx8D5kH3a/Desafio-Flugo?node-id=2101-9297&t=ZcgP4ZVsOtCzzCIN-1)
- **Repositório GitHub**: [https://github.com/vinicius030303/flugo-form](https://github.com/vinicius030303/flugo-form)

---
## 👨‍💻 Autor

**Vinicius S.**  
📧 vinicius__santos@live.com  
📱 (44) 9 9741-7617  
🔗 [LinkedIn](https://linkedin.com/in/vinicius-front)

---

*Tenho disciplina, autonomia, foco em solução e total interesse em crescer com projetos reais.*
