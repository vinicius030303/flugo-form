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


## 📂 Estrutura de pastas

src/  
├── components/ # Componentes reutilizáveis (StepForm, tabelas, etc.)   
├── components/forms/ # Etapas do formulário (StepOne, StepTwo, StepThree)   
├── services/ # Configuração do Firebase e integrações  
├── pages/ # Páginas principais (Colaboradores)   
├── styles/ # Estilos globais  

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

## 🔗 Links

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


