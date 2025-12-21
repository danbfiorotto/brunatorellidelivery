# Documentação Visual e Funcional - EndoSystem

## 📋 Visão Geral do Sistema

### Propósito
O **EndoSystem** é uma plataforma de gestão completa para profissionais de endodontia. O sistema permite gerenciar pacientes, agendamentos, clínicas parceiras, relatórios financeiros e histórico de procedimentos, tudo em uma interface moderna e intuitiva.

### Público-Alvo
Profissionais de endodontia que precisam organizar seus atendimentos, controlar receitas, gerenciar relacionamento com clínicas parceiras e acompanhar a evolução clínica de seus pacientes.

### Identidade Visual
O sistema possui uma identidade visual moderna e profissional, utilizando gradientes suaves em tons de azul (sky) e verde esmeralda (emerald), transmitindo confiança e profissionalismo. A interface suporta modo claro e escuro, adaptando-se às preferências do usuário.

---

## 🎨 Paleta de Cores

### Cores Principais
- **Gradiente Primário**: Azul Sky (#0ea5e9) → Verde Esmeralda (#10b981)
  - Usado em headers, botões principais e elementos de destaque
- **Azul Sky**: #0ea5e9 (sky-500)
- **Verde Esmeralda**: #10b981 (emerald-500)
- **Violeta**: #8b5cf6 (violet-500) - usado em cards de clínicas
- **Âmbar**: #f59e0b (amber-500) - usado em indicadores de pendências

### Cores de Fundo
- **Modo Claro**: Branco (#ffffff) e cinza claro (#f8fafc)
- **Modo Escuro**: Cinza escuro (#111827) e cinza médio (#1f2937)

### Cores de Texto
- **Modo Claro**: Cinza escuro (#0f172a) para textos principais
- **Modo Escuro**: Branco (#ffffff) para textos principais
- **Textos Secundários**: Cinza médio (#64748b)

### Estados de Elementos
- **Sucesso**: Verde esmeralda (#10b981)
- **Aviso/Pendente**: Âmbar (#f59e0b)
- **Erro/Perigo**: Vermelho (#ef4444)
- **Informação**: Azul sky (#0ea5e9)

---

## 📐 Estrutura de Layout

### Layout Principal
O sistema utiliza um layout de sidebar fixa no desktop e navegação inferior no mobile:

**Desktop (≥1024px)**:
- Sidebar fixa à esquerda (288px de largura)
- Conteúdo principal com margem esquerda para acomodar a sidebar
- Header com logo e informações do usuário na sidebar

**Mobile (<1024px)**:
- Header fixo no topo com menu hambúrguer
- Navegação inferior fixa (bottom navigation) com ícones
- Conteúdo principal com padding adequado para evitar sobreposição

### Componentes de Layout
- **Sidebar**: Painel lateral com navegação principal, logo e informações do usuário
- **Header Mobile**: Barra superior com logo e botão de menu
- **Bottom Navigation**: Barra de navegação inferior no mobile com 6 itens principais
- **Main Content**: Área de conteúdo com padding responsivo e largura máxima

---

## 🧭 Navegação

### Menu Principal
O sistema possui 6 seções principais acessíveis via navegação:

1. **Painel (Dashboard)** - Visão geral e estatísticas
2. **Atendimentos** - Gerenciamento de procedimentos
3. **Relatórios** - Análises financeiras e de produtividade
4. **Clínicas** - Gestão de clínicas parceiras
5. **Pacientes** - Cadastro e histórico de pacientes
6. **Perfil** - Configurações pessoais e preferências

### Estados de Navegação
- **Item Ativo**: Destaque com gradiente azul-verde, texto branco e sombra
- **Item Hover**: Fundo cinza claro e mudança de cor do texto
- **Transições**: Animações suaves de 200ms em todas as interações

---

## 📱 Páginas e Funcionalidades

### 1. Página de Login

#### Visual
- Layout dividido em duas colunas (apenas desktop)
- **Lado Esquerdo (Desktop)**: 
  - Fundo com gradiente azul escuro (sky-600 a blue-800)
  - Efeitos de blur com círculos decorativos
  - Logo "EndoSystem" com ícone de estetoscópio
  - Título grande: "Transforme a gestão do seu consultório"
  - Texto descritivo e badges de funcionalidades
- **Lado Direito**: 
  - Formulário de login centralizado
  - Título "Bem-vindo de volta"
  - Campos de email e senha com bordas arredondadas
  - Checkbox "Lembrar de mim"
  - Link "Esqueceu a senha?"
  - Botão principal grande com gradiente

#### Funcionalidades
- Login com email e senha
- Validação de campos obrigatórios
- Mensagens de erro em destaque (fundo vermelho claro)
- Link para página de registro
- Redirecionamento automático após login bem-sucedido

#### Mobile
- Apenas o formulário é exibido, sem a coluna esquerda
- Layout centralizado e responsivo

---

### 2. Página de Registro

#### Visual
- Mesma estrutura visual da página de login
- Formulário com 3 campos:
  - Email
  - Senha (com indicação de mínimo de 6 caracteres)
  - Confirmar Senha
- Botão com ícone de usuário e texto "Criar Conta"

#### Funcionalidades
- Validação de email válido
- Validação de senha (mínimo 6 caracteres)
- Verificação de correspondência entre senhas
- Mensagens de erro contextuais
- Redirecionamento para login após registro bem-sucedido

---

### 3. Dashboard (Painel Geral)

#### Visual
- **Header com Gradiente**: 
  - Banner grande com gradiente azul-verde
  - Título "Painel Geral" em destaque
  - Botões de ação (Exportar PDF, Novo Atendimento) no canto direito
- **Cards de Estatísticas** (4 cards em grid):
  - **Faturamento do Mês**: Card verde esmeralda com ícone de dólar
    - Mostra valor recebido e valor pendente
  - **Atendimentos**: Card azul sky com ícone de calendário
    - Total de procedimentos do mês
  - **Clínicas Cadastradas**: Card violeta com ícone de prédio
    - Número de parceiros ativos
  - **Ticket Médio**: Card âmbar com ícone de tendência
    - Valor médio por atendimento
- **Gráfico de Produtividade Semanal**:
  - Gráfico de barras comparando atendimentos finalizados vs pendentes
  - Seletor de período (últimos 7 dias, este mês)
  - Cores: Verde para finalizados, âmbar para pendentes
- **Ranking de Clínicas**:
  - Lista das top 5 clínicas por faturamento
  - Cada item mostra: posição, nome, número de atendimentos, percentual e valor
  - Badge com percentual de participação
  - Link "Ver todas" que leva para página de clínicas

#### Funcionalidades
- Exibição de estatísticas em tempo real
- Gráfico interativo com dados semanais
- Ranking dinâmico de clínicas
- Exportação de relatório em PDF
- Acesso rápido para criar novo atendimento
- Animações de entrada suaves (stagger effect)

#### Interações
- Hover nos cards mostra leve elevação
- Gráfico com tooltips informativos
- Clique em clínica do ranking leva para detalhes

---

### 4. Página de Atendimentos

#### Visual
- **Header com Gradiente**: Similar ao dashboard
  - Título "Atendimentos"
  - Botão "Novo Atendimento" em destaque
- **Cards de Resumo** (3 cards):
  - Valor Recebido (verde)
  - Valor Pendente (âmbar)
  - Total de Atendimentos (azul)
- **Barra de Filtros**:
  - Busca por nome, clínica ou procedimento
  - Filtros por status (Todos, Pagos, Pendentes, Agendados)
  - Ordenação por colunas (com setas indicando direção)
- **Tabela de Atendimentos**:
  - Colunas: Paciente, Procedimento, Data & Hora, Clínica, Valor, Status, Ações
  - Linhas alternadas com hover effect
  - Badges coloridos para status
  - Ícones de editar e excluir em cada linha
  - Paginação na parte inferior

#### Funcionalidades
- Listagem paginada de atendimentos
- Busca em tempo real (com debounce)
- Filtros por status de pagamento
- Ordenação por qualquer coluna
- Criação de novo atendimento via modal
- Edição de atendimento existente
- Exclusão com confirmação
- Upload de radiografias durante criação/edição
- Cálculo automático de valores com porcentagem

#### Modal de Atendimento
- **Formulário Completo**:
  - Seleção de clínica (dropdown)
  - Data e hora do atendimento
  - Busca de paciente com autocomplete
  - Criação rápida de novo paciente
  - Seleção de procedimento ou criação de procedimento customizado
  - Campo de valor com formatação de moeda
  - Seleção de moeda (BRL, USD, EUR)
  - Tipo de recebimento (100% ou porcentagem)
  - Campo de porcentagem (quando aplicável)
  - Checkbox "Pagamento realizado?"
  - Data de pagamento (quando marcado como pago)
  - Campo de evolução clínica (textarea grande)
  - Campo de observações
  - Upload de múltiplas radiografias com preview
- **Validações Visuais**:
  - Campos obrigatórios destacados
  - Mensagens de erro abaixo dos campos
  - Cálculo em tempo real do valor a receber

#### Interações
- Clique em linha da tabela pode abrir detalhes
- Hover mostra ações de editar/excluir
- Modal com animação de entrada
- Upload de arquivos com drag & drop visual
- Preview de imagens antes do upload

---

### 5. Página de Pacientes

#### Visual
- **Header com Gradiente**: Padrão do sistema
  - Estatísticas: Total de Pacientes e Total de Atendimentos
  - Botão "Novo Paciente"
- **Barra de Busca**:
  - Campo de busca com ícone de lupa
  - Busca em tempo real (debounce de 500ms)
- **Lista de Pacientes**:
  - Cards horizontais para cada paciente
  - Avatar circular com inicial do nome
  - Nome em destaque
  - Email e telefone com ícones
  - Data da última visita
  - Seta indicando que é clicável
  - Hover effect com mudança de cor

#### Funcionalidades
- Listagem paginada de pacientes
- Busca por nome, email ou telefone
- Criação de novo paciente via modal
- Navegação para detalhes do paciente ao clicar
- Visualização de estatísticas no header

#### Modal de Novo Paciente
- Formulário simples com:
  - Nome completo (obrigatório)
  - Email (opcional)
  - Telefone (opcional, com máscara)
- Validação de campos
- Mensagens de erro contextuais

#### Estado Vazio
- Quando não há pacientes, exibe:
  - Ícone grande de usuário
  - Mensagem "Nenhum paciente encontrado"
  - Sugestão para buscar ou cadastrar

---

### 6. Página de Detalhes do Paciente

#### Visual
- **Header com Gradiente**:
  - Avatar grande com inicial
  - Nome do paciente em destaque
  - Email e telefone
  - Botões de ação (Editar, Excluir)
- **Abas de Navegação**:
  - Resumo
  - Atendimentos
  - Radiografias
  - Indicador visual da aba ativa
- **Aba Resumo**:
  - Cards com estatísticas:
    - Total de Atendimentos
    - Total de Radiografias
    - Receita Total
    - Paciente Desde (data)
    - Último Atendimento
  - Card de "Próximo Atendimento" (quando houver)
- **Aba Atendimentos**:
  - Lista de cards com histórico
  - Cada card mostra: procedimento, clínica, data/hora, valor, status
  - Badge colorido para status
  - Botão para ver detalhes completos
- **Aba Radiografias**:
  - Grid de imagens (2-4 colunas dependendo da tela)
  - Cada imagem em card com:
    - Preview da radiografia
    - Overlay com informações no hover
    - Botões de ação (ampliar, excluir) no hover
  - Área de upload com borda tracejada
  - Botão para selecionar arquivos

#### Funcionalidades
- Visualização completa do histórico do paciente
- Edição de dados do paciente
- Exclusão (com confirmação e aviso sobre atendimentos relacionados)
- Upload de radiografias
- Visualização ampliada de radiografias em modal
- Navegação para criar novo atendimento para o paciente
- Cálculo automático de receita total

#### Modais
- **Modal de Edição**: Formulário para atualizar dados
- **Modal de Imagem**: Visualização ampliada com informações do atendimento relacionado
- **Modal de Detalhes do Atendimento**: Informações completas incluindo evolução clínica e observações

---

### 7. Página de Clínicas

#### Visual
- **Header com Gradiente**: Padrão
  - Estatísticas: Total de Clínicas, Total de Atendimentos, Ticket Médio Geral
  - Botão "Nova Clínica"
- **Barra de Busca**: Campo de busca para filtrar clínicas
- **Tabela de Clínicas**:
  - Colunas: Nome, Contato, Endereço, Ticket Médio, Atendimentos, Status, Ações
  - Ícone de prédio para cada clínica
  - Email e telefone com ícones
  - Endereço com ícone de localização
  - Badge "Ativa" em verde
  - Botões de editar e excluir

#### Funcionalidades
- Listagem paginada de clínicas
- Busca por nome
- Criação de nova clínica
- Edição de dados da clínica
- Exclusão (com confirmação)
- Visualização de estatísticas por clínica
- Cálculo automático de ticket médio

#### Modal de Clínica
- Formulário com:
  - Nome da clínica (obrigatório)
  - Endereço (opcional)
  - Telefone (opcional, com máscara)
  - Email (opcional)
- Validações e mensagens de erro

---

### 8. Página de Relatórios

#### Visual
- **Header com Gradiente**: Padrão
  - Seletor de período (dropdown estilizado)
  - Botão "Exportar PDF"
- **Cards de Estatísticas** (3 cards):
  - Serviços Prestados (verde)
  - Ticket Médio (azul)
  - Total Atendimentos (violeta)
- **Gráficos**:
  - **Gráfico de Barras**: Recebido vs. Pendente
    - Comparativo mensal
    - Cores: Verde para recebido, âmbar para pendente
  - **Gráfico de Pizza**: Distribuição por Clínica
    - Percentual e valores por clínica
    - Legenda ao lado
    - Tooltips com informações detalhadas
- **Tabela de Atendimentos**:
  - Lista completa dos atendimentos do período
  - Colunas: Data, Paciente, Clínica, Status, Valor
  - Badges coloridos para status
  - Valores formatados com moeda

#### Funcionalidades
- Filtros por período:
  - Mês atual
  - Mês passado
  - Período customizado (com seletor de datas)
- Cálculos automáticos de:
  - Receita total recebida
  - Ticket médio
  - Distribuição por clínica
- Exportação de relatório completo em PDF
- Gráficos interativos com tooltips
- Visualização detalhada de todos os atendimentos do período

#### Modal de Período Customizado
- Dois campos de data (inicial e final)
- Botões rápidos (2 meses atrás, 3 meses atrás)
- Validação de datas
- Botão "Aplicar Período"

---

### 9. Página de Perfil

#### Visual
- **Header com Gradiente**: Padrão
- **Layout em Grid**:
  - **Sidebar Esquerda**: Card com avatar grande, nome, email e botão de sair
  - **Conteúdo Principal**: Dois cards de formulários
    - **Informações Pessoais**:
      - Nome completo
      - Email (desabilitado)
      - Telefone (com máscara)
    - **Preferências**:
      - Idioma (dropdown: Português, Inglês, Espanhol)
      - Moeda (dropdown: BRL, EUR, USD)
      - Tema (dropdown: Claro, Escuro, Automático)
      - Descrição do tema selecionado

#### Funcionalidades
- Edição de dados pessoais
- Alteração de preferências de idioma
- Alteração de moeda padrão
- Alteração de tema (aplicação imediata)
- Logout da conta
- Validação de campos
- Salvamento de configurações

---

## 🎭 Componentes de Interface

### Botões

#### Variantes
1. **Primário (Primary)**:
   - Gradiente azul-verde
   - Texto branco
   - Sombra com cor do gradiente
   - Hover: Gradiente mais escuro e sombra aumentada
   - Animações: Scale no hover (1.02) e no click (0.98)

2. **Secundário (Secondary)**:
   - Fundo branco/cinza escuro
   - Borda cinza
   - Texto cinza escuro/branco
   - Hover: Fundo cinza claro

3. **Ghost**:
   - Fundo transparente
   - Texto cinza
   - Hover: Fundo cinza muito claro

4. **Danger**:
   - Fundo vermelho claro
   - Texto vermelho
   - Borda vermelha
   - Hover: Fundo vermelho mais escuro

#### Estados
- **Normal**: Estado padrão
- **Hover**: Leve elevação e mudança de cor
- **Active/Click**: Leve compressão (scale 0.98)
- **Disabled**: Opacidade reduzida e cursor não permitido

---

### Cards

#### Características
- Fundo branco/cinza escuro
- Borda sutil
- Sombra leve
- Bordas arredondadas (rounded-2xl)
- Padding generoso
- Hover: Sombra aumentada

#### Tipos de Cards
1. **Card de Estatística**:
   - Gradiente de fundo suave
   - Ícone grande no canto
   - Número grande em destaque
   - Texto descritivo menor
   - Badge com informação adicional

2. **Card de Conteúdo**:
   - Fundo sólido
   - Título opcional com linha divisória
   - Conteúdo flexível

3. **Card de Lista**:
   - Usado em rankings e listas
   - Hover effect destacado
   - Informações organizadas horizontalmente

---

### Modais

#### Características
- Overlay escuro semi-transparente com blur
- Modal centralizado
- Fundo branco/cinza escuro
- Bordas arredondadas
- Sombra pronunciada
- Animação de entrada (fade + slide)

#### Estrutura
- **Header**: Título e botão de fechar (X)
- **Body**: Conteúdo do formulário ou informações
- **Footer**: Botões de ação (Cancelar, Salvar)

#### Tamanhos
- **Padrão**: Largura média
- **XL**: Largura maior para conteúdo extenso (detalhes de atendimento, imagens)

---

### Tabelas

#### Características
- Cabeçalho com texto em negrito
- Linhas alternadas (zebra striping)
- Hover effect nas linhas
- Bordas sutis
- Padding adequado nas células
- Alinhamento de texto apropriado (números à direita)

#### Funcionalidades
- Ordenação por colunas (setas indicando direção)
- Ações por linha (editar, excluir)
- Badges para status
- Responsividade com scroll horizontal no mobile

---

### Inputs

#### Características
- Bordas arredondadas
- Borda cinza que muda para azul no foco
- Anel de foco (ring) com cor do tema
- Padding confortável
- Labels acima dos campos
- Placeholders informativos

#### Estados
- **Normal**: Borda cinza
- **Foco**: Borda azul e anel de foco
- **Erro**: Borda vermelha e mensagem abaixo
- **Disabled**: Fundo cinza e cursor não permitido

#### Tipos Especiais
- **DateInput**: Seletor de data nativo
- **TimeInput**: Seletor de hora
- **PhoneInput**: Máscara automática de telefone
- **CurrencyInput**: Formatação de moeda

---

### Badges

#### Variantes
1. **Success (Sucesso)**: Verde - para status "Pago", "Ativo"
2. **Warning (Aviso)**: Âmbar - para status "Pendente"
3. **Primary (Primário)**: Azul - para status "Agendado"
4. **Danger (Perigo)**: Vermelho - para erros

#### Características
- Texto pequeno e em negrito
- Fundo colorido suave
- Bordas arredondadas (pill shape)
- Padding horizontal e vertical mínimo

---

### Paginação

#### Características
- Números de página clicáveis
- Setas de navegação (anterior/próxima)
- Indicador da página atual
- Informação de total de páginas
- Desabilitado quando não aplicável

---

## 🎬 Animações e Transições

### Animações de Entrada
- **Fade In**: Elementos aparecem gradualmente
- **Slide Up**: Elementos deslizam de baixo para cima
- **Stagger**: Elementos aparecem em sequência (usado em listas e grids)

### Animações de Interação
- **Hover**: Leve elevação (scale ou shadow)
- **Click**: Leve compressão (scale 0.98)
- **Transições**: Duração de 200-300ms para suavidade

### Transições de Página
- **Route Changes**: Fade out/in com leve movimento vertical
- **Modal Open/Close**: Fade + scale
- **Tab Switching**: Fade suave

---

## 📱 Responsividade

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1023px
- **Desktop**: ≥ 1024px (lg)

### Adaptações Mobile

#### Navegação
- Sidebar vira menu hambúrguer no topo
- Bottom navigation fixa na parte inferior
- Menu overlay com blur no fundo

#### Layout
- Grids se tornam coluna única
- Tabelas ganham scroll horizontal
- Cards empilham verticalmente
- Modais ocupam quase toda a tela

#### Tipografia
- Tamanhos de fonte reduzidos proporcionalmente
- Espaçamentos ajustados
- Headers menores mas ainda legíveis

#### Interações
- Áreas de toque aumentadas (mínimo 44x44px)
- Botões maiores e mais espaçados
- Inputs com altura confortável para toque

---

## 🔄 Fluxos de Usuário Principais

### 1. Fluxo de Login
1. Usuário acessa a página de login
2. Preenche email e senha
3. Clica em "Entrar na Plataforma"
4. Sistema valida credenciais
5. Redireciona para Dashboard
6. Se erro, exibe mensagem destacada

### 2. Fluxo de Criação de Atendimento
1. Usuário clica em "Novo Atendimento" (Dashboard ou página de Atendimentos)
2. Modal abre com formulário
3. Usuário seleciona clínica
4. Define data e hora
5. Busca ou cria paciente
6. Seleciona ou cria procedimento
7. Define valor e tipo de pagamento
8. (Opcional) Adiciona evolução clínica e observações
9. (Opcional) Faz upload de radiografias
10. Clica em "Salvar Atendimento"
11. Sistema valida e salva
12. Modal fecha e lista atualiza
13. Toast de sucesso aparece

### 3. Fluxo de Visualização de Paciente
1. Usuário acessa página de Pacientes
2. Busca ou navega pela lista
3. Clica em um paciente
4. Página de detalhes abre com 3 abas
5. Usuário navega entre abas
6. Pode editar dados, ver atendimentos ou gerenciar radiografias
7. Pode criar novo atendimento para o paciente

### 4. Fluxo de Geração de Relatório
1. Usuário acessa página de Relatórios
2. Seleciona período (mês atual, passado ou customizado)
3. Sistema carrega dados e exibe gráficos
4. Usuário analisa estatísticas e gráficos
5. (Opcional) Clica em "Exportar PDF"
6. Sistema gera PDF com todos os dados
7. Download automático do arquivo

### 5. Fluxo de Upload de Radiografia
1. Usuário está na página de detalhes do paciente
2. Navega para aba "Radiografias"
3. Clica em "Selecionar Arquivo"
4. Seletor de arquivo abre
5. Usuário seleciona imagem(s)
6. Sistema valida tipo e tamanho
7. Preview das imagens aparece
8. Sistema faz upload
9. Imagens aparecem no grid
10. Toast de sucesso confirma

---

## 💡 Feedback e Mensagens

### Toasts (Notificações)
- **Sucesso**: Verde, ícone de check
- **Erro**: Vermelho, ícone de X
- **Aviso**: Âmbar, ícone de alerta
- Posicionamento: Canto superior direito
- Animação de entrada e saída
- Auto-dismiss após alguns segundos

### Mensagens de Erro
- Aparecem abaixo dos campos com problema
- Texto vermelho
- Ícone ou indicador visual
- Desaparecem quando erro é corrigido

### Estados de Carregamento
- Texto "Carregando..." em áreas específicas
- (Futuro: Spinners animados)
- Desabilitações de botões durante ações

### Confirmações
- Modais de confirmação para ações destrutivas
- Mensagens claras sobre consequências
- Botões "Cancelar" e "Confirmar"

---

## 🎯 Padrões de Design

### Espaçamento
- Sistema de espaçamento consistente (múltiplos de 4px)
- Padding generoso em cards e modais
- Espaçamento adequado entre elementos relacionados

### Tipografia
- Hierarquia clara: Títulos grandes, subtítulos médios, texto corpo pequeno
- Pesos: Bold para títulos, semibold para labels, regular para corpo
- Linha de altura confortável para leitura

### Bordas e Cantos
- Bordas arredondadas em todos os elementos (rounded-xl, rounded-2xl)
- Cantos suaves transmitem modernidade

### Sombras
- Sombras sutis para profundidade
- Sombras mais pronunciadas em elementos elevados (modais, cards no hover)
- Sombras coloridas em elementos com gradiente

### Ícones
- Biblioteca: Lucide React
- Tamanho consistente (18-24px para ações, maiores para decorativos)
- Cores que seguem o tema (cinza para neutros, cores do tema para ações)

---

## 🌓 Modo Escuro

### Características
- Ativação automática ou manual
- Cores adaptadas para contraste adequado
- Fundos escuros (cinza-900, cinza-800)
- Textos claros (branco, cinza-200)
- Bordas mais sutis (cinza-700)
- Gradientes mantidos mas ajustados para melhor visibilidade

### Elementos Adaptados
- Todos os componentes suportam modo escuro
- Cards, modais, inputs, botões - tudo adaptado
- Gráficos mantêm legibilidade
- Ícones e imagens preservam contraste

---

## 📊 Gráficos e Visualizações

### Gráfico de Barras
- Biblioteca: Chart.js
- Cores: Verde para positivo, âmbar para pendente
- Barras arredondadas
- Tooltips informativos no hover
- Legenda clara
- Grid sutil para leitura

### Gráfico de Pizza
- Cores variadas para diferenciação
- Legenda ao lado com percentuais
- Tooltips com valores absolutos e percentuais
- Bordas entre fatias para clareza

---

## 🔍 Busca e Filtros

### Campo de Busca
- Ícone de lupa à esquerda
- Placeholder descritivo
- Busca em tempo real (com debounce)
- Limpeza fácil (X quando há texto)

### Filtros
- Badges clicáveis para status
- Estado ativo destacado
- Contador de resultados quando aplicável
- Reset fácil

### Ordenação
- Setas indicando direção (↑ ↓)
- Coluna ativa destacada
- Alternância entre asc/desc no clique

---

## 🎨 Elementos Decorativos

### Gradientes
- Uso extensivo de gradientes azul-verde
- Aplicado em headers, botões principais, cards de destaque
- Transição suave entre cores

### Efeitos de Blur
- Backdrop blur em overlays
- Efeito glassmorphism em alguns elementos
- Profundidade visual

### Círculos Decorativos
- Usados em páginas de login/registro
- Círculos grandes com blur e transparência
- Movimento sutil (futuro: animação)

---

## 📝 Observações Finais

### Acessibilidade
- Contraste adequado em todos os elementos
- Áreas de toque generosas no mobile
- Navegação por teclado funcional
- Labels descritivos em todos os inputs

### Performance Visual
- Animações suaves mas não excessivas
- Transições rápidas (200-300ms)
- Carregamento progressivo de conteúdo
- Estados de loading claros

### Consistência
- Padrões visuais aplicados consistentemente
- Componentes reutilizáveis
- Cores e espaçamentos padronizados
- Comportamentos previsíveis

### Extensibilidade
- Sistema de design permite fácil adição de novos componentes
- Cores e espaçamentos via variáveis CSS
- Estrutura modular facilita manutenção

---

## 📌 Resumo Executivo

O **EndoSystem** é uma plataforma moderna e profissional para gestão de consultórios de endodontia. A interface utiliza uma paleta de cores baseada em gradientes azul-verde, transmitindo confiança e profissionalismo. O design é totalmente responsivo, adaptando-se perfeitamente a dispositivos móveis, tablets e desktops.

A navegação é intuitiva, com sidebar fixa no desktop e menu inferior no mobile. Todas as páginas seguem um padrão visual consistente, com headers com gradiente, cards informativos e tabelas organizadas. O sistema oferece feedback visual constante através de toasts, mensagens de erro e estados de carregamento.

As principais funcionalidades incluem gestão completa de pacientes, atendimentos, clínicas e relatórios financeiros, tudo com uma interface limpa e moderna que prioriza a usabilidade e a experiência do usuário.

