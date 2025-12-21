# 🏗️ Arquitetura do Projeto

## Visão Geral

Este projeto implementa **Clean Architecture** (Arquitetura Limpa) com princípios de **Domain-Driven Design (DDD)**, garantindo separação clara de responsabilidades, testabilidade e manutenibilidade.

## Camadas da Arquitetura

### 1. Domain Layer (`/src/domain`)

**Responsabilidade**: Contém as regras de negócio puras, independentes de frameworks e infraestrutura.

#### Entidades (`/entities`)
- `Patient.ts`: Entidade de paciente
- `Appointment.ts`: Entidade de agendamento
- `Clinic.ts`: Entidade de clínica

**Características**:
- Encapsulam lógica de negócio
- São imutáveis quando possível
- Não dependem de frameworks externos

#### Value Objects (`/value-objects`)
- `Email.ts`: Validação e encapsulamento de email
- `Phone.ts`: Validação e encapsulamento de telefone
- `Money.ts`: Representação de valores monetários
- `Name.ts`: Validação de nomes
- `Time.ts`: Representação de horários

**Características**:
- Imutáveis
- Validam seus próprios dados
- Comparação por valor, não por referência

#### Domain Services (`/services`)
- `PatientDomainService.ts`: Lógica de negócio específica de pacientes
- `AppointmentDomainService.ts`: Lógica de negócio específica de agendamentos

**Características**:
- Contêm lógica que não pertence a uma única entidade
- Operam sobre múltiplas entidades

### 2. Application Layer (`/src/application`)

**Responsabilidade**: Orquestra casos de uso e coordena entre camadas.

#### Use Cases (`/use-cases`)

Cada caso de uso é uma classe isolada que:
- Recebe input validado
- Executa lógica de negócio
- Retorna output tipado
- Gerencia side effects (auditoria, cache, etc.)

**Patient Use Cases**:
- `CreatePatientUseCase`: Cria novo paciente
- `UpdatePatientUseCase`: Atualiza paciente existente
- `DeletePatientUseCase`: Remove paciente
- `GetPatientUseCase`: Busca paciente por ID
- `GetAllPatientsUseCase`: Lista pacientes com paginação

**Appointment Use Cases**:
- `CreateAppointmentUseCase`: Cria novo agendamento
- `UpdateAppointmentUseCase`: Atualiza agendamento
- `DeleteAppointmentUseCase`: Remove agendamento
- `GetAppointmentUseCase`: Busca agendamento por ID
- `GetAllAppointmentsUseCase`: Lista agendamentos com paginação

**Fluxo de um Use Case**:
1. Validação de input (via `IInputValidator`)
2. Sanitização de dados (via `ISanitizer`)
3. Execução da lógica de negócio
4. Persistência (via Repository)
5. Side effects (auditoria, cache, etc.)

#### Application Services (`/services`)

Orquestram múltiplos Use Cases e fornecem APIs de alto nível:
- `PatientService`: Orquestra Use Cases de Patient
- `AppointmentService`: Orquestra Use Cases de Appointment
- `DashboardService`: Agrega dados para dashboard
- `ClinicService`: Gerencia clínicas
- `ReportsService`: Gera relatórios

### 3. Infrastructure Layer (`/src/infrastructure`)

**Responsabilidade**: Implementações concretas de adaptadores e serviços externos.

#### Repositories (`/repositories`)
- `PatientRepository`: Implementa `IPatientRepository`
- `AppointmentRepository`: Implementa `IAppointmentRepository`
- `ClinicRepository`: Implementa `IClinicRepository`

**Características**:
- Abstraem acesso a dados
- Implementam interfaces definidas na camada de aplicação
- Usam `DatabaseAdapter` para queries

#### Database (`/database`)
- `DatabaseAdapter`: Adaptador para Supabase
- `QueryBuilder`: Builder fluente para queries

#### Services (`/auth`, `/cache`, `/audit`, etc.)
- `AuthService`: Implementa `IAuthService`
- `CacheService`: Implementa `ICacheService`
- `AuditService`: Implementa `IAuditService`
- `SanitizerService`: Implementa `ISanitizer`
- `ErrorHandler`: Implementa `IErrorHandler`

### 4. Presentation Layer (`/src/pages`, `/src/components`)

**Responsabilidade**: Interface do usuário (React).

- **Pages**: Páginas principais da aplicação
- **Components**: Componentes reutilizáveis
- **Contexts**: Contextos React (Auth, Theme, Language, Currency)

## Dependency Injection

O projeto utiliza um **DI Container** customizado (`/src/infrastructure/di/Container.ts`) que:

1. Registra todas as interfaces e implementações
2. Resolve dependências automaticamente
3. Gerencia ciclo de vida (singleton, transient)

**Exemplo de Registro**:
```typescript
container.register<IPatientRepository>('IPatientRepository', PatientRepository);
container.register<ICacheService>('ICacheService', CacheService, { singleton: true });
```

## Fluxo de Dados

### Criar um Paciente

1. **Presentation**: Componente React chama `PatientService.create()`
2. **Application**: `PatientService` delega para `CreatePatientUseCase`
3. **Use Case**: 
   - Valida input via `IInputValidator`
   - Sanitiza dados via `ISanitizer`
   - Cria entidade `Patient`
   - Persiste via `IPatientRepository`
   - Registra auditoria via `IAuditService`
   - Invalida cache via `ICacheService`
4. **Infrastructure**: `PatientRepository` usa `DatabaseAdapter` para persistir
5. **Domain**: Entidade `Patient` valida regras de negócio

## Princípios Aplicados

### SOLID

- **S**ingle Responsibility: Cada classe tem uma única responsabilidade
- **O**pen/Closed: Extensível via interfaces, fechado para modificação
- **L**iskov Substitution: Implementações respeitam contratos de interfaces
- **I**nterface Segregation: Interfaces específicas e focadas
- **D**ependency Inversion: Dependências de abstrações, não implementações

### Clean Code

- Nomes descritivos e autoexplicativos
- Funções pequenas e focadas
- Comentários apenas quando necessário
- Código DRY (Don't Repeat Yourself)
- Early returns para reduzir complexidade

### Design Patterns

- **Repository Pattern**: Abstração de acesso a dados
- **Use Case Pattern**: Casos de uso explícitos
- **Factory Pattern**: Criação de entidades
- **Strategy Pattern**: Algoritmos variáveis
- **Dependency Injection**: Inversão de controle

## Testabilidade

A arquitetura facilita testes através de:

1. **Interfaces**: Todas as dependências são interfaces, facilitando mocks
2. **Use Cases Isolados**: Cada caso de uso pode ser testado independentemente
3. **Dependency Injection**: Fácil substituir implementações por mocks
4. **Separação de Responsabilidades**: Cada camada pode ser testada isoladamente

## Performance

### Otimizações Implementadas

1. **Agregações SQL**: Cálculos feitos no banco, não em memória
2. **Cache Estratégico**: Cache com TTL e invalidação por tags
3. **Paginação**: Queries paginadas para grandes volumes
4. **Queries Paralelas**: `Promise.all()` para operações independentes
5. **Lazy Loading**: Carregamento sob demanda quando apropriado

### Exemplo de Otimização

**Antes** (carregar tudo em memória):
```typescript
const appointments = await repository.findAll();
const revenue = appointments
  .filter(a => a.status === 'paid')
  .reduce((sum, a) => sum + a.value, 0);
```

**Depois** (agregação SQL):
```typescript
const revenue = await db.rpc('calculate_revenue', { start_date });
```

## Segurança

### Implementações

1. **Sanitização**: Todos os inputs são sanitizados
2. **Validação**: Validação em múltiplas camadas (DTO, Domain)
3. **Autenticação**: Verificação de autenticação em Use Cases
4. **Auditoria**: Todas as operações críticas são auditadas
5. **Rate Limiting**: Proteção contra abuso de API

## Manutenibilidade

### Estrutura Consistente

- Mesmo padrão em todos os Use Cases
- Mesmo padrão em todos os Services
- Mesmo padrão em todos os Repositories
- Nomenclatura consistente

### Extensibilidade

- Fácil adicionar novos Use Cases
- Fácil adicionar novos Services
- Fácil substituir implementações (via interfaces)
- Fácil adicionar novas features sem quebrar código existente

## Próximos Passos

1. Expandir cobertura de testes para 90%+
2. Adicionar testes de integração
3. Implementar CQRS para leitura/escrita separadas
4. Adicionar Event Sourcing para auditoria completa
5. Implementar Saga Pattern para transações distribuídas

