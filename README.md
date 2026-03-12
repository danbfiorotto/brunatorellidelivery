# 🦷 EndoSystem

<div align="center">
  <h3>Sistema de gestão avançada para profissionais de endodontia</h3>
  <p>Desenvolvido com React, Vite, TailwindCSS e Supabase (Arquitetura Limpa / DDD).</p>
</div>

---

## 📖 Sobre o Projeto

O **EndoSystem** é um sistema de gestão completo desenvolvido especificamente para profissionais de endodontia. Ele substitui planilhas, cadernos e sistemas desorganizados por uma plataforma moderna que centraliza todas as informações importantes do consultório: pacientes, atendimentos, clínicas parceiras, receitas e relatórios.

Tudo isso com uma interface fácil de usar, visualmente agradável (suporte a modo claro/escuro) e totalmente responsiva.

## ✨ Funcionalidades Principais

- 👥 **Gestão de Pacientes**: Cadastro completo, histórico de atendimentos, painel de radiografias e estatísticas financeiras consolidadas por paciente.
- 📅 **Gestão de Atendimentos**: Controle minucioso de procedimentos, horários, comissões de clínicas (por valor fixo ou %), acompanhamento do status de recebimento (pago ou pendente) e campos para evolução clínica.
- 🏥 **Gestão de Clínicas Parceiras**: Controle detalhado dos locais de atendimento, identificando facilmente quais clínicas geram maior receita (Ranking e Ticket Médio).
- 📊 **Dashboard Financeiro e Produtividade**: Visão geral em tempo real com gráficos dinâmicos (Chart.js), analisando faturamento mensal recebido vs. pendente e acompanhamento de produtividade semanal.
- 📑 **Relatórios Exportáveis**: Geração de relatórios financeiros aprofundados, filtrados por períodos específicos e exportáveis diretamente para PDF (jsPDF).
- 🩻 **Gestão de Imagens e Radiografias**: Upload seguro, ampliação (zoom) e fácil associação de inúmeras imagens radiográficas a cada avaliação ou paciente.
- ⚙️ **Personalização de Uso**: Preferências de idioma ativas (i18next suporte nativo para Português, Inglês e Espanhol), escolha de moeda padrão (BRL/USD/EUR) e temas (Dark/Light).

## 💻 Stack & Tecnologias

- **Frontend Core**: React 19, Vite, TypeScript.
- **Estilização & UI**: TailwindCSS, Framer Motion (para transições suaves) e ícones (Lucide React).
- **Gerenciamento de Estado & Data Fetching**: React Query, Context API.
- **Gráficos & PDFs**: Chart.js, react-chartjs-2, jsPDF.
- **Formulários & Validação**: Zod.
- **Backend as a Service (BaaS)**: Supabase (Provedor de Auth, Database PostgreSQL e File Storage).
- **Qualidade & Testes**: Vitest, React Testing Library, ESLint, integração visando >80% de code coverage.

## 🏗️ Padrões de Arquitetura (Clean Architecture & DDD)

O projeto foi estruturado seguindo as melhores práticas mundiais de engenharia de software – notadamente **Clean Architecture** e princípios fundamentais do **Domain-Driven Design (DDD)**. Ele divide as responsabilidades nas seguintes camadas internas (`/src`):

- **Domain (`/domain`)**: Contém as regras de negócio vitais e únicas do software (`Entities`, `Value Objects`, `Domain Services`). Em total isolamento, não consome qualquer dependência externa ou framework de UI.
- **Application (`/application`)**: Camada orquestradora que coordena os `Use Cases` da aplicação, lida primariamente com os DTOs de transição e validações de input, sendo o elo entre o mundo exterior e os modelos de domínio.
- **Infrastructure (`/infrastructure`)**: Camada focada em adaptar os componentes externos para que o sistema interno possa persistir dados, ler os mesmos e gerenciar autenticação. Integra ativamente o Repository Pattern adaptado para acesso ao Supabase, e inclui Injeção de Dependências Customizada (`Container.ts`).
- **Presentation (`/pages` e `/components`)**: Única camada com dependências pesadas em React. Comanda a interface e experiência visual isolando a regra de negócio num local sem poluição estrutural.

### Excelência Técnica Aplicada:
- **SOLID, DRY, KISS** aplicados sistematicamente.
- **Design Patterns Comuns**: Repository, Use Case, Factory, DI (Dependency Injection Container).
- **Performance de Escala**: Cálculos críticos que impactariam recursos na UI são resolvidos puramente usando infraestrutura de BD como Remote Procedure Calls (Ex.: `calculate_revenue` no PostgreSQL Supabase), além de `Promise.all` em operações independentes.

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm.
- Uma conta ativa no ecosistema [Supabase](https://supabase.com/).

### Passo a Passo

1. **Clone do Repositório**
   ```bash
   git clone <seu-repositorio>
   cd endosystem
   ```

2. **Instalação das Dependências**
   ```bash
   npm install
   ```

3. **Iniciando a Conexão com Supabase**
   - Crie um novo projeto lá no painel do Supabase.
   - Navegue até o **SQL Editor**.
   - Execute sistematicamente na sequência, o conteúdo dos arquivos disponíveis na raiz, criando as tabelas, as RPCs (funções do bd) e as políticas RLS de restrição de segurança.
     - `supabase_schema.sql`
     - `supabase_create_rpc_function.sql`
     - `supabase_audit_logs_fix.sql`
     - `supabase_security_fix.sql`
   - Acesse **Project Settings > API** no Supabase e colete as chaves necessárias.

4. **Variáveis de Ambiente (`.env`)**
   Crie na raiz do projeto o arquivo `.env` mapeando as chaves que você acabou de extrair com nomes padronizados pelo Vite:
   ```env
   VITE_SUPABASE_URL=sua_project_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
   ```

5. **Iniciando Localmente**
   ```bash
   npm run dev
   ```
   A aplicação roda lindamente por padrão no endpoit `http://localhost:5173`.

## 🧪 Suíte de Testes

Foco em alta confiabilidade, testando de casos de uso às queries de repositório.

- **Execução Automática de Testes Unitários e Integração**: 
  ```bash
  npm run test
  ```
- **Abordagem de Testes com Interface Visual**: 
  ```bash
  npm run test:ui
  ```
- **Mapeamento de Cobertura**: 
  ```bash
  npm run test:coverage
  ```

## 🔒 Postura de Segurança e Proteção de Dados

Sendo um sistema focado em tratamentos de saúde, o Endosystem implementa várias camadas de proteção de falhas e de acessos em conformidade com as melhores práticas de mercado:
- **Camada de Sanitização de Dados**: Bloqueio ativo mitigando XSS Injection via integração robusta utilizando `DOMPurify`.
- **Validação de Cargas Estritas**: Validações precisas pré-processamento suportadas pelas estruturas `Zod`.
- **Bloqueios Nativos no BD (RLS)**: Tabelas são totalmente configuradas com Row Level Security no próprio PostgreSQL, impedindo transversalmente qualquer delegação incorreta de usuários pelo back.
- **Auditoria Transparente**: Integração modular implementada acompanhando logs para detecções investigativa nos bancos de dados (`IAuditService`).

---
<div align="center">
  <i>Projetado e desenhado com foco no conforto e no gerenciamento preciso voltado para a clínica Endodôntica!</i>
</div>
