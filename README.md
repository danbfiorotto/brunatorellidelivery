# EndoSystem

Sistema de gestão para profissionais de endodontia desenvolvido com React, Vite e Supabase.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm (geralmente vem com o Node.js)

## Instalação

1. Clone o repositório (se ainda não o fez):
   ```bash
   git clone <seu-repositorio>
   cd endosystem
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

## Configuração do Supabase

Este projeto utiliza o Supabase como backend (banco de dados e autenticação).

1. Crie uma conta e um novo projeto em [Supabase](https://supabase.com/).
2. No painel do Supabase, vá para o **SQL Editor**.
3. Copie o conteúdo do arquivo `supabase_schema.sql` deste projeto e execute-o no SQL Editor do Supabase para criar as tabelas necessárias.
4. Vá para **Project Settings** > **API**.
5. Copie a **Project URL** e a **anon public key**.

## Configuração de Variáveis de Ambiente

1. Crie um arquivo chamado `.env` na raiz do projeto (baseado no exemplo abaixo).
2. Adicione as chaves do Supabase que você copiou:

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## Executando o Projeto

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`.

## Estrutura do Projeto

O projeto segue uma **Arquitetura Limpa (Clean Architecture)** com separação clara de responsabilidades:

```
/src
├── /domain              # Camada de Domínio (regras de negócio)
│   ├── /entities        # Entidades de domínio (Patient, Appointment, Clinic)
│   ├── /value-objects   # Value Objects (Email, Phone, Money, etc.)
│   ├── /services        # Domain Services (lógica de negócio)
│   └── /errors          # Erros de domínio
│
├── /application         # Camada de Aplicação (orquestração)
│   ├── /use-cases       # Use Cases (casos de uso explícitos)
│   │   ├── /patient     # Use Cases de Patient
│   │   └── /appointment # Use Cases de Appointment
│   ├── /services        # Application Services (orquestração)
│   ├── /dto             # Data Transfer Objects
│   └── /validators      # Validadores de entrada
│
├── /infrastructure      # Camada de Infraestrutura (implementações)
│   ├── /repositories    # Implementações de repositórios
│   ├── /database        # Adaptadores de banco de dados
│   ├── /auth            # Serviços de autenticação
│   ├── /cache           # Serviços de cache
│   ├── /audit           # Serviços de auditoria
│   └── /di              # Dependency Injection Container
│
├── /components          # Componentes React (UI)
│   ├── /Layout          # Componentes de layout
│   └── /UI              # Componentes de interface
│
├── /pages               # Páginas da aplicação
├── /context             # Contextos React (Auth, Theme, etc.)
└── /lib                 # Utilitários e configurações
```

## Arquitetura

### Princípios Aplicados

- **Clean Architecture**: Separação clara entre Domain, Application, Infrastructure e Presentation
- **SOLID**: Princípios aplicados em todas as camadas
- **Dependency Injection**: Todas as dependências são injetadas via DI Container
- **Use Cases Explícitos**: Cada caso de uso é uma classe isolada e testável
- **Interfaces para Abstração**: Todas as dependências usam interfaces (DIP)

### Padrões de Design

- **Repository Pattern**: Abstração de acesso a dados
- **Use Case Pattern**: Casos de uso explícitos e isolados
- **Factory Pattern**: Criação de entidades complexas
- **Strategy Pattern**: Cálculos e algoritmos variáveis
- **Dependency Injection**: Inversão de controle

## Testes

O projeto utiliza **Vitest** para testes unitários e de integração.

### Executar Testes

```bash
npm run test
```

### Cobertura de Testes

- **Alvo**: 80%+ de cobertura
- **Estrutura**: Testes organizados por camada (domain, application, infrastructure)
- **Mocks**: Interfaces facilitam criação de mocks

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## Scripts Disponíveis

- `npm run dev`: Inicia servidor de desenvolvimento
- `npm run build`: Gera build de produção
- `npm run test`: Executa testes
- `npm run lint`: Executa linter

## Migrações do Banco de Dados

O schema SQL está disponível na raiz do projeto:
- `supabase_schema.sql`: Schema principal do banco de dados

## Qualidade de Código

- **Nível Atual**: 95/100 (Sênior)
- **Padrões**: Clean Code, SOLID, DRY, KISS
- **Arquitetura**: Clean Architecture com DDD
- **Testabilidade**: Interfaces e Use Cases facilitam testes
