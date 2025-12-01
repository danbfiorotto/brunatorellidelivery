# Meu EndoDelivery Replica

Replica do sistema "Meu EndoDelivery" desenvolvida com React, Vite e Supabase.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm (geralmente vem com o Node.js)

## Instalação

1. Clone o repositório (se ainda não o fez):
   ```bash
   git clone <seu-repositorio>
   cd meu-endodelivery-replica
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

- `/src`: Código fonte da aplicação
  - `/components`: Componentes Reutilizáveis
  - `/pages`: Páginas da aplicação
  - `/lib`: Configurações de bibliotecas (ex: Supabase)
- `supabase_schema.sql`: Esquema do banco de dados
