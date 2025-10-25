# Documentação da API de Microsserviços

## 🏗️ Arquitetura

### Componentes
- **Eureka Server** (Porta 8761): Descoberta de serviços
- **API Gateway** (Porta 8080): Roteamento e autenticação central
- **Auth Service** (Porta 8081): Autenticação e autorização
- **Core Service** (Porta 8082): Gestão de empresas, usuários e funcionários

### Fluxo de Autenticação
```
1. Cliente → API Gateway → Auth Service (login/register)
2. Auth Service → JWT Token + Refresh Token
3. Cliente → API Gateway (com token) → Core Service
4. API Gateway valida token com Auth Service
5. Core Service processa requisição
```

## 🔐 Autenticação

### Registro de Usuário
```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "role": "user" // opcional: admin, manager, hr, user
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "user_id",
    "email": "usuario@exemplo.com",
    "role": "user"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### Verificar Token
```http
GET /auth/verify
Authorization: Bearer <access_token>
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}
```

## 🏢 Core Service - Empresas

### Listar Empresas
```http
GET /api/empresa
Authorization: Bearer <access_token>
```

### Buscar Empresa por ID
```http
GET /api/empresa/:id
Authorization: Bearer <access_token>
```

### Criar Empresa (Admin/Manager)
```http
POST /api/empresa
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nome": "Empresa Exemplo",
  "cnpj": "12345678000195",
  "endereco": {
    "rua": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234567"
  },
  "contato": {
    "telefone": "(11) 1234-5678",
    "email": "contato@empresa.com",
    "site": "https://empresa.com"
  }
}
```

### Atualizar Empresa
```http
PUT /api/empresa/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nome": "Novo Nome da Empresa"
}
```

### Deletar Empresa (Soft Delete)
```http
DELETE /api/empresa/:id
Authorization: Bearer <access_token>
```

## 👤 Core Service - Usuários

### Listar Usuários
```http
GET /api/usuario
Authorization: Bearer <access_token>
```

### Buscar Usuário por ID
```http
GET /api/usuario/:id
Authorization: Bearer <access_token>
```

### Criar Usuário
```http
POST /api/usuario
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "cpf": "12345678901",
  "dataNascimento": "1990-01-01",
  "endereco": {
    "rua": "Rua A",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234567"
  },
  "contato": {
    "telefone": "(11) 1234-5678",
    "celular": "(11) 98765-4321"
  },
  "empresa": "empresa_id"
}
```

## 👷 Core Service - Funcionários

### Listar Funcionários
```http
GET /api/funcionario
Authorization: Bearer <access_token>
```

### Buscar Funcionário por ID
```http
GET /api/funcionario/:id
Authorization: Bearer <access_token>
```

### Criar Funcionário (Admin/Manager/HR)
```http
POST /api/funcionario
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nome": "Maria Santos",
  "email": "maria@empresa.com",
  "cpf": "98765432100",
  "cargo": "Desenvolvedora",
  "departamento": "TI",
  "dataAdmissao": "2023-01-15",
  "salario": 8000,
  "endereco": {
    "rua": "Rua B",
    "numero": "456",
    "bairro": "Vila Nova",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "04567890"
  },
  "contato": {
    "telefone": "(11) 2345-6789",
    "celular": "(11) 87654-3210"
  },
  "empresa": "empresa_id",
  "supervisor": "funcionario_id" // opcional
}
```

## 🔒 Níveis de Acesso

### Roles e Permissões
- **admin**: Acesso total a todos os recursos
- **manager**: Pode gerenciar empresas, usuários e funcionários
- **hr**: Pode gerenciar funcionários
- **user**: Acesso limitado aos próprios dados

### Endpoints por Role
- `/api/empresa/*` - Admin, Manager
- `/api/usuario/*` - Todos os usuários autenticados
- `/api/funcionario/*` - Admin, Manager, HR

## 🚀 Como Executar

### Desenvolvimento
```bash
# Iniciar todos os serviços
./scripts/start-dev.sh

# Testar serviços
./scripts/test-services.sh

# Parar serviços
docker-compose down
```

### Produção
```bash
# Iniciar em modo produção
docker-compose -f docker-compose.yml up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

## 📊 Monitoramento

### Health Checks
- Eureka Server: `http://localhost:8761/health`
- API Gateway: `http://localhost:8080/health`
- Auth Service: `http://localhost:8081/health`
- Core Service: `http://localhost:8082/health`

### Logs
Todos os serviços geram logs estruturados em JSON no diretório `logs/` de cada serviço.

## 🔧 Configuração

### Variáveis de Ambiente
Cada serviço possui seu arquivo `.env` com configurações específicas. Para produção, altere:
- Senhas do banco de dados
- Chaves JWT
- URLs dos serviços
- Configurações de CORS

### Segurança
- Senhas são criptografadas com bcrypt (12 rounds)
- Tokens JWT com expiração de 15 minutos
- Refresh tokens com expiração de 7 dias
- Rate limiting configurado
- CORS adequadamente configurado
- Headers de segurança com Helmet.js