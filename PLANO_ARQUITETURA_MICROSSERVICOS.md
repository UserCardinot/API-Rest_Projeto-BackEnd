# 🏗️ PLANO DE ARQUITETURA DE MICROSSERVIÇOS

## 📋 VISÃO GERAL

Este documento apresenta um plano **sincero, realista e robusto** para transformar a aplicação monolítica atual em uma arquitetura de microsserviços escalável e segura.

---

## 🎯 ARQUITETURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│                    (Web/Mobile/API)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                              │
│  • Roteamento                                                │
│  • Rate Limiting                                             │
│  • Load Balancing                                            │
│  • Circuit Breaker                                           │
│  • Validação inicial                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  EUREKA SERVER                               │
│              (Service Discovery)                             │
│  • Registro de serviços                                      │
│  • Health Check                                              │
│  • Load Balancing                                            │
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┬──────────────┐
        ▼                             ▼              ▼
┌──────────────┐           ┌──────────────┐  ┌──────────────┐
│  API AUTH    │           │  API CORE    │  │  OUTROS      │
│              │◄─────────►│              │  │  SERVIÇOS    │
│ • Login      │           │ • Empresa    │  │              │
│ • Registro   │           │ • Usuario    │  │ • Cursos     │
│ • JWT        │           │ • Funcionario│  │ • Exercicios │
│ • Refresh    │           │ • CRUD       │  │ • Videoaulas │
│ • OAuth2     │           │ • Validação  │  │              │
└──────────────┘           └──────────────┘  └──────────────┘
        │                          │                  │
        ▼                          ▼                  ▼
┌──────────────┐           ┌──────────────┐  ┌──────────────┐
│  MongoDB     │           │  MongoDB     │  │  MongoDB     │
│  (Auth DB)   │           │  (Core DB)   │  │  (Others)    │
└──────────────┘           └──────────────┘  └──────────────┘
```

---

## 📝 FASE 1: PLANEJAMENTO DA ARQUITETURA

### 1.1 Princípios Fundamentais

**Princípios que DEVEMOS seguir:**
- ✅ **Single Responsibility**: Cada microsserviço tem UMA responsabilidade clara
- ✅ **Database per Service**: Cada serviço tem seu próprio banco de dados
- ✅ **API First**: Contratos de API bem definidos (OpenAPI/Swagger)
- ✅ **Stateless**: Serviços não mantêm estado de sessão
- ✅ **Idempotência**: Operações podem ser repetidas sem efeitos colaterais
- ✅ **Fail Fast**: Falhas são detectadas e reportadas rapidamente
- ✅ **Circuit Breaker**: Proteção contra falhas em cascata

**Princípios que são BONITOS mas complicam (evitar no início):**
- ⚠️ Event Sourcing (complexo demais para começar)
- ⚠️ SAGA patterns distribuídos (só se necessário)
- ⚠️ CQRS completo (over-engineering para maioria dos casos)

### 1.2 Estrutura de Diretórios

```
/workspace
├── services/
│   ├── eureka-server/          # Service Discovery
│   ├── api-gateway/            # Gateway centralizado
│   ├── auth-service/           # Autenticação e Autorização
│   ├── core-service/           # Empresa, Usuário, Funcionário
│   ├── cursos-service/         # Migrado do monolito
│   ├── exercicios-service/     # Migrado do monolito
│   └── videoaulas-service/     # Migrado do monolito
├── shared/
│   ├── libs/                   # Bibliotecas compartilhadas
│   ├── models/                 # Modelos de dados comuns
│   └── utils/                  # Utilitários
├── docker/
│   ├── docker-compose.yml      # Orquestração local
│   └── docker-compose.prod.yml # Orquestração produção
└── docs/
    ├── architecture/           # Diagramas e decisões
    └── api/                    # Documentação de APIs
```

---

## 🔍 FASE 2: EUREKA SERVER (Service Discovery)

### 2.1 Problema que Resolve

**Sem Service Discovery:**
```javascript
// API Gateway precisa saber IPs fixos - RUIM! ❌
const authServiceUrl = 'http://192.168.1.10:3001';
const coreServiceUrl = 'http://192.168.1.11:3002';
// E se o IP mudar? E se subir outra instância? QUEBRA!
```

**Com Service Discovery:**
```javascript
// API Gateway consulta Eureka dinamicamente - BOM! ✅
const authServiceUrl = await eureka.getService('auth-service');
const coreServiceUrl = await eureka.getService('core-service');
// Eureka retorna instâncias disponíveis e saudáveis automaticamente!
```

### 2.2 Implementação HONESTA

**OPÇÃO 1: Eureka Server (Netflix OSS) - Java/Spring Boot**

✅ **PRÓS:**
- Padrão da indústria, maduro e testado
- Ótima documentação e comunidade
- Integração nativa com Spring Cloud

❌ **CONTRAS:**
- Requer Java/Spring (sua stack é Node.js)
- Overhead de manutenção adicional
- Curva de aprendizado se não conhece Java

**OPÇÃO 2: Consul (HashiCorp) - Agnóstico de linguagem**

✅ **PRÓS:**
- Agnóstico de linguagem
- Service Discovery + Key/Value Store + Health Checks
- Ótima para Node.js (cliente oficial)
- Simples de configurar

❌ **CONTRAS:**
- Requer instalação e manutenção do Consul
- Complexidade adicional

**OPÇÃO 3: Custom Service Registry (Node.js puro) - RECOMENDADO PARA COMEÇAR**

✅ **PRÓS:**
- Total controle
- Mesma stack (Node.js)
- Simples e direto
- Você entende exatamente como funciona

❌ **CONTRAS:**
- Você precisa implementar (mas é simples!)
- Menos features prontas

### 2.3 Implementação Recomendada (Custom Service Registry)

**Estrutura básica:**

```javascript
// services/eureka-server/index.js
const express = require('express');
const app = express();

// Registro de serviços em memória
const serviceRegistry = new Map();

// Registrar serviço
app.post('/register', (req, res) => {
  const { serviceName, host, port, metadata } = req.body;
  
  if (!serviceRegistry.has(serviceName)) {
    serviceRegistry.set(serviceName, []);
  }
  
  const serviceInstance = {
    id: `${serviceName}-${Date.now()}`,
    host,
    port,
    metadata,
    lastHeartbeat: Date.now(),
    status: 'UP'
  };
  
  serviceRegistry.get(serviceName).push(serviceInstance);
  res.json({ success: true, instance: serviceInstance });
});

// Health check / Heartbeat
app.put('/heartbeat/:serviceId', (req, res) => {
  // Atualizar lastHeartbeat
  // Marcar como UP
});

// Descobrir serviço
app.get('/discover/:serviceName', (req, res) => {
  const instances = serviceRegistry.get(req.params.serviceName) || [];
  const healthyInstances = instances.filter(i => 
    Date.now() - i.lastHeartbeat < 30000 // 30 segundos
  );
  
  // Load balancing simples: Round Robin
  const instance = healthyInstances[
    Math.floor(Math.random() * healthyInstances.length)
  ];
  
  res.json(instance);
});

// Limpeza de instâncias mortas (job periódico)
setInterval(() => {
  for (const [serviceName, instances] of serviceRegistry.entries()) {
    const alive = instances.filter(i => 
      Date.now() - i.lastHeartbeat < 60000
    );
    serviceRegistry.set(serviceName, alive);
  }
}, 30000);
```

**Características:**
- ✅ Registro e descoberta de serviços
- ✅ Health checks via heartbeat
- ✅ Load balancing básico (Round Robin)
- ✅ Auto-remoção de instâncias mortas
- ✅ Simples e funcional

---

## 🚪 FASE 3: API GATEWAY

### 3.1 Responsabilidades do Gateway

**O que o Gateway DEVE fazer:**
1. ✅ **Roteamento**: Direcionar requisições para o serviço correto
2. ✅ **Autenticação**: Validar JWT antes de chamar serviços
3. ✅ **Rate Limiting**: Proteger contra abuso
4. ✅ **CORS**: Gerenciar políticas de CORS
5. ✅ **Logging**: Log centralizado de requisições
6. ✅ **Circuit Breaker**: Proteção contra falhas em cascata

**O que o Gateway NÃO DEVE fazer:**
- ❌ Lógica de negócio
- ❌ Transformações complexas de dados
- ❌ Acesso direto a bancos de dados
- ❌ Ser um monolito disfarçado

### 3.2 Implementação Recomendada

**Tecnologias:**
- Express.js (base)
- express-rate-limit (rate limiting)
- http-proxy-middleware (proxy reverso)
- opossum (circuit breaker)

**Estrutura:**

```javascript
// services/api-gateway/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const CircuitBreaker = require('opossum');
const jwt = require('jsonwebtoken');

const app = express();

// Rate Limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requisições por IP
});
app.use(limiter);

// Descobrir serviço via Eureka
async function getServiceUrl(serviceName) {
  const response = await fetch(`http://eureka-server:8761/discover/${serviceName}`);
  const instance = await response.json();
  return `http://${instance.host}:${instance.port}`;
}

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  // Rotas públicas
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/register')) {
    return next();
  }
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

app.use(authMiddleware);

// Circuit Breaker para cada serviço
const createServiceProxy = (serviceName, pathPrefix) => {
  const breaker = new CircuitBreaker(async (req, res, next) => {
    const serviceUrl = await getServiceUrl(serviceName);
    
    createProxyMiddleware({
      target: serviceUrl,
      pathRewrite: { [`^${pathPrefix}`]: '' },
      onError: (err, req, res) => {
        console.error(`Erro ao chamar ${serviceName}:`, err);
        res.status(503).json({ error: 'Serviço temporariamente indisponível' });
      }
    })(req, res, next);
  }, {
    timeout: 3000, // 3 segundos
    errorThresholdPercentage: 50,
    resetTimeout: 30000 // 30 segundos
  });
  
  breaker.fallback(() => {
    return { error: 'Serviço em manutenção, tente novamente' };
  });
  
  return breaker;
};

// Rotas
app.use('/auth', createProxyMiddleware({
  target: () => getServiceUrl('auth-service'),
  pathRewrite: { '^/auth': '' }
}));

app.use('/core', createProxyMiddleware({
  target: () => getServiceUrl('core-service'),
  pathRewrite: { '^/core': '' }
}));

app.use('/cursos', createProxyMiddleware({
  target: () => getServiceUrl('cursos-service'),
  pathRewrite: { '^/cursos': '' }
}));

// Health Check do Gateway
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log('API Gateway rodando na porta 3000');
});
```

### 3.3 Padrões de Resiliência

**1. Circuit Breaker (Disjuntor)**
```
Estado CLOSED → Requisições passam normalmente
↓ (muitas falhas)
Estado OPEN → Bloqueia requisições, retorna fallback
↓ (após timeout)
Estado HALF_OPEN → Testa se serviço voltou
↓ (sucesso)
Estado CLOSED → Volta ao normal
```

**2. Retry com Backoff Exponencial**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s...
    }
  }
}
```

**3. Timeout**
```javascript
async function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}
```

---

## 🔐 FASE 4: API AUTH (Autenticação e Autorização)

### 4.1 Responsabilidades

**O que o Auth Service faz:**
1. ✅ Login (email + senha)
2. ✅ Registro de usuários
3. ✅ Geração de JWT (Access Token + Refresh Token)
4. ✅ Refresh de tokens
5. ✅ Validação de tokens (endpoint para outros serviços)
6. ✅ OAuth2 (Google, Facebook, GitHub)
7. ✅ MFA (Multi-Factor Authentication) - opcional
8. ✅ Recuperação de senha
9. ✅ Gerenciamento de sessões

**O que NÃO faz:**
- ❌ CRUD de usuários (isso é o Core Service)
- ❌ Lógica de negócio de usuários
- ❌ Autorização de recursos específicos (isso é cada serviço)

### 4.2 Modelo de Dados (Auth Database)

```javascript
// User Auth (apenas dados de autenticação)
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  salt: String,
  isActive: Boolean,
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  mfaEnabled: Boolean,
  mfaSecret: String,
  refreshTokens: [{
    token: String,
    expiresAt: Date,
    createdAt: Date,
    deviceInfo: String
  }],
  oauthProviders: [{
    provider: String, // 'google', 'facebook'
    providerId: String,
    accessToken: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 4.3 Fluxo de Autenticação JWT (Recomendado)

**1. Login:**
```
Cliente → POST /auth/login { email, password }
         ↓
Auth Service → Valida credenciais
         ↓
Auth Service → Gera Access Token (15min) + Refresh Token (7 dias)
         ↓
Cliente ← { accessToken, refreshToken, expiresIn: 900 }
```

**2. Requisição Autenticada:**
```
Cliente → GET /core/users/me
          Header: Authorization: Bearer {accessToken}
         ↓
API Gateway → Valida token JWT localmente (rápido!)
         ↓
Core Service → Processa requisição
         ↓
Cliente ← Resposta
```

**3. Refresh Token:**
```
Cliente → POST /auth/refresh { refreshToken }
         ↓
Auth Service → Valida refresh token no banco
         ↓
Auth Service → Gera novo Access Token
         ↓
Cliente ← { accessToken, expiresIn: 900 }
```

### 4.4 Segurança CRÍTICA

**1. Hash de Senha (bcrypt)**
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12; // Aumentado de 10 para mais segurança

// Nunca armazene senhas em texto puro!
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// Comparação
const isValid = await bcrypt.compare(password, hashedPassword);
```

**2. JWT com Claims Seguros**
```javascript
const jwt = require('jsonwebtoken');

// Access Token (curta duração)
const accessToken = jwt.sign(
  {
    userId: user._id,
    email: user.email,
    roles: user.roles, // IMPORTANTE: incluir roles
    type: 'access'
  },
  process.env.JWT_SECRET,
  { expiresIn: '15m', issuer: 'auth-service', audience: 'api-gateway' }
);

// Refresh Token (longa duração, armazenado no banco)
const refreshToken = jwt.sign(
  { userId: user._id, type: 'refresh', jti: uuid() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

**3. Proteção contra Brute Force**
```javascript
// Limitar tentativas de login
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 horas

if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new Error('Conta bloqueada. Tente novamente mais tarde.');
  }
  // Resetar se o tempo de bloqueio passou
  user.loginAttempts = 0;
  user.lockUntil = null;
}

// Incrementar tentativas em caso de senha errada
user.loginAttempts += 1;
if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
  user.lockUntil = Date.now() + LOCK_TIME;
}
```

**4. Rotação de Refresh Tokens**
```javascript
// Quando refresh token é usado, gerar novo e invalidar o antigo
async function refreshAccessToken(oldRefreshToken) {
  const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
  
  // Verificar se está na lista de tokens válidos no banco
  const user = await User.findById(decoded.userId);
  const tokenIndex = user.refreshTokens.findIndex(t => t.token === oldRefreshToken);
  
  if (tokenIndex === -1) {
    throw new Error('Refresh token inválido ou já utilizado');
  }
  
  // Remover token antigo
  user.refreshTokens.splice(tokenIndex, 1);
  
  // Gerar novo par de tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  
  // Armazenar novo refresh token
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now()
  });
  
  await user.save();
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

---

## 🏢 FASE 5: API CORE (Empresa, Usuário, Funcionário)

### 5.1 Domínios do Core Service

**1. Empresa**
```javascript
{
  _id: ObjectId,
  razaoSocial: String,
  nomeFantasia: String,
  cnpj: String, // Único
  email: String,
  telefone: String,
  endereco: {
    logradouro: String,
    numero: String,
    complemento: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  status: String, // 'ativa', 'inativa', 'suspensa'
  plano: String, // 'basico', 'premium', 'enterprise'
  dataContratacao: Date,
  configuracoes: {
    theme: String,
    timezone: String,
    idioma: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**2. Usuário (Perfil Completo)**
```javascript
{
  _id: ObjectId,
  authUserId: ObjectId, // Referência ao Auth Service
  empresaId: ObjectId,
  nome: String,
  cpf: String, // Único
  email: String, // Sincronizado com Auth
  telefone: String,
  dataNascimento: Date,
  avatar: String, // URL
  endereco: { /* mesma estrutura */ },
  perfil: String, // 'admin', 'gerente', 'usuario', 'funcionario'
  departamento: String,
  cargo: String,
  status: String, // 'ativo', 'inativo', 'suspenso'
  metadata: {
    ultimoAcesso: Date,
    preferencias: Object
  },
  createdAt: Date,
  updatedAt: Date
}
```

**3. Funcionário (Extensão de Usuário)**
```javascript
{
  _id: ObjectId,
  usuarioId: ObjectId,
  empresaId: ObjectId,
  matricula: String, // Único por empresa
  dataAdmissao: Date,
  dataDemissao: Date,
  salario: Number, // Criptografado!
  beneficios: [{
    tipo: String, // 'vale-transporte', 'vale-refeicao'
    valor: Number
  }],
  supervisor: ObjectId, // Referência a outro funcionário
  horarioTrabalho: {
    entrada: String, // '08:00'
    saida: String, // '18:00'
    diasSemana: [Number] // [1,2,3,4,5]
  },
  documentos: [{
    tipo: String, // 'ctps', 'rg', 'comprovante_residencia'
    url: String,
    uploadedAt: Date
  }],
  status: String, // 'ativo', 'ferias', 'afastado', 'demitido'
  createdAt: Date,
  updatedAt: Date
}
```

### 5.2 Endpoints do Core Service

```
# Empresas
POST   /empresas              # Criar empresa
GET    /empresas              # Listar empresas (admin)
GET    /empresas/:id          # Obter empresa
PUT    /empresas/:id          # Atualizar empresa
DELETE /empresas/:id          # Desativar empresa
GET    /empresas/:id/usuarios # Listar usuários da empresa

# Usuários
POST   /usuarios              # Criar usuário (+ criar no Auth Service)
GET    /usuarios              # Listar usuários
GET    /usuarios/:id          # Obter usuário
GET    /usuarios/me           # Obter usuário logado
PUT    /usuarios/:id          # Atualizar usuário
DELETE /usuarios/:id          # Desativar usuário (+ desativar no Auth)
PUT    /usuarios/:id/avatar   # Upload avatar

# Funcionários
POST   /funcionarios          # Criar funcionário
GET    /funcionarios          # Listar funcionários da empresa
GET    /funcionarios/:id      # Obter funcionário
PUT    /funcionarios/:id      # Atualizar funcionário
DELETE /funcionarios/:id      # Desligar funcionário
POST   /funcionarios/:id/documentos  # Upload documentos
GET    /funcionarios/:id/supervisor  # Obter supervisor
```

### 5.3 Comunicação com Auth Service

**Cenário: Criar novo usuário**

```javascript
// Core Service: POST /usuarios
async function criarUsuario(req, res) {
  const { nome, email, senha, cpf, empresaId } = req.body;
  
  try {
    // 1. Criar usuário no Auth Service
    const authResponse = await fetch('http://auth-service/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    
    if (!authResponse.ok) {
      throw new Error('Erro ao criar usuário no Auth Service');
    }
    
    const { authUserId } = await authResponse.json();
    
    // 2. Criar perfil completo no Core Service
    const usuario = await Usuario.create({
      authUserId,
      nome,
      email,
      cpf,
      empresaId,
      perfil: 'usuario',
      status: 'ativo'
    });
    
    // 3. Enviar email de boas-vindas (assíncrono)
    await sendWelcomeEmail(email, nome).catch(err => 
      console.error('Erro ao enviar email:', err)
    );
    
    res.status(201).json({ success: true, usuario });
    
  } catch (error) {
    // IMPORTANTE: Rollback! Se falhou, desfazer operações
    // Idealmente usar transações distribuídas ou padrão SAGA
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}
```

**Problema: Consistência Eventual**

Se o Core Service criar o usuário mas o Auth Service falhar (ou vice-versa), você tem dados inconsistentes!

**Soluções:**

1. **2-Phase Commit (Complexo)** ❌
   - Difícil de implementar
   - Performance ruim

2. **Saga Pattern (Recomendado)** ✅
   ```
   1. Core Service: Criar usuário (status: 'pending')
   2. Auth Service: Criar auth
   3. Core Service: Atualizar status para 'active'
   
   Se falhar:
   1. Auth Service: Deletar auth (compensação)
   2. Core Service: Deletar usuário (rollback)
   ```

3. **Eventos + Message Broker** ✅
   ```
   Core Service → Publica evento "UserCreated"
   Auth Service → Escuta evento e cria auth
   Auth Service → Publica evento "UserAuthCreated"
   Core Service → Escuta e ativa usuário
   ```

### 5.4 Criptografia de Dados Sensíveis

```javascript
const crypto = require('crypto');

// Criptografar salário
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text.toString());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Uso no modelo
FuncionarioSchema.pre('save', function(next) {
  if (this.isModified('salario')) {
    this.salario = encrypt(this.salario);
  }
  next();
});

FuncionarioSchema.methods.getSalarioDecrypted = function() {
  return parseFloat(decrypt(this.salario));
};
```

---

## 🔗 FASE 6: COMUNICAÇÃO ENTRE MICROSSERVIÇOS

### 6.1 Padrões de Comunicação

**1. Síncrona (REST)** - Para operações imediatas

✅ **Quando usar:**
- Operações CRUD simples
- Validações em tempo real
- Consultas rápidas

❌ **Quando NÃO usar:**
- Operações longas (>3 segundos)
- Muitos serviços encadeados
- Alta carga

```javascript
// Exemplo: Core Service chama Auth Service
const response = await fetch('http://auth-service/validate-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});
```

**2. Assíncrona (Message Broker)** - Para eventos e processos longos

✅ **Quando usar:**
- Eventos de domínio (UserCreated, OrderPlaced)
- Processos em background
- Notificações
- Integração com múltiplos serviços

✅ **Vantagens:**
- Desacoplamento total
- Alta resiliência
- Processamento em lote

**Tecnologias:**
- **RabbitMQ**: Mais simples, leve, fácil de configurar ⭐ RECOMENDADO
- **Apache Kafka**: Extremamente escalável, mas complexo
- **Redis Pub/Sub**: Simples mas sem garantias de entrega

### 6.2 Implementação com RabbitMQ

**Instalação:**
```bash
npm install amqplib
```

**Publisher (Core Service):**
```javascript
const amqp = require('amqplib');

class EventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
  }
  
  async connect() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange('events', 'topic', { durable: true });
  }
  
  async publish(eventName, data) {
    const message = JSON.stringify({
      eventName,
      data,
      timestamp: new Date().toISOString(),
      serviceId: 'core-service'
    });
    
    this.channel.publish(
      'events',
      eventName, // routing key: 'user.created', 'user.updated'
      Buffer.from(message),
      { persistent: true }
    );
    
    console.log(`Evento publicado: ${eventName}`);
  }
}

// Uso
const publisher = new EventPublisher();
await publisher.connect();

// Quando criar usuário
await publisher.publish('user.created', {
  userId: user._id,
  email: user.email,
  empresaId: user.empresaId
});
```

**Consumer (Auth Service):**
```javascript
class EventConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }
  
  async connect() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange('events', 'topic', { durable: true });
  }
  
  async subscribe(pattern, handler) {
    const queue = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(queue.queue, 'events', pattern);
    
    this.channel.consume(queue.queue, async (msg) => {
      const content = JSON.parse(msg.content.toString());
      
      try {
        await handler(content);
        this.channel.ack(msg); // Confirmar processamento
      } catch (error) {
        console.error('Erro ao processar evento:', error);
        // Rejeitar e reenviar para fila de DLQ (Dead Letter Queue)
        this.channel.nack(msg, false, false);
      }
    });
  }
}

// Uso
const consumer = new EventConsumer();
await consumer.connect();

// Escutar eventos de usuário
await consumer.subscribe('user.*', async (event) => {
  if (event.eventName === 'user.created') {
    console.log('Novo usuário criado:', event.data.userId);
    // Processar evento...
  }
});
```

### 6.3 Padrão Event-Driven: Exemplo Completo

**Cenário: Criar usuário + Enviar email + Atualizar cache**

```
1. API Gateway → POST /usuarios
        ↓
2. Core Service → Criar usuário no banco
        ↓
3. Core Service → Publica evento "user.created"
        ↓
   ┌────────────┴────────────┬─────────────┐
   ▼                         ▼             ▼
Auth Service          Email Service    Cache Service
   │                        │             │
   └─ Cria auth            └─ Envia     └─ Invalida
                             email         cache
        ↓                        ↓             ↓
   Publica                 Publica        Publica
   "auth.created"       "email.sent"   "cache.invalidated"
        ↓                        ↓             ↓
   Core Service escuta e marca usuário como 'ativo'
```

**Vantagens:**
- ✅ Desacoplamento: Serviços não se conhecem diretamente
- ✅ Resiliência: Se Email Service cair, não afeta criação
- ✅ Escalabilidade: Fácil adicionar novos consumidores
- ✅ Auditoria: Histórico completo de eventos

---

## 🔒 FASE 7: SEGURANÇA

### 7.1 Checklist de Segurança CRÍTICA

#### 7.1.1 Autenticação e Autorização

- ✅ **JWT com expiração curta** (15 minutos)
- ✅ **Refresh Tokens rotativos**
- ✅ **Validação de tokens em TODAS as requisições**
- ✅ **RBAC (Role-Based Access Control)**
- ✅ **Limitar tentativas de login**
- ✅ **MFA para operações críticas**

#### 7.1.2 Comunicação

- ✅ **HTTPS obrigatório em produção**
- ✅ **TLS entre microsserviços** (mTLS)
- ✅ **Validação de certificados**

```javascript
// Configuração HTTPS no Gateway
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca.pem') // Opcional
};

https.createServer(options, app).listen(443);
```

#### 7.1.3 Proteção contra Ataques

**1. SQL Injection** (ou NoSQL Injection)
```javascript
// ❌ VULNERÁVEL
const user = await User.findOne({ email: req.body.email });

// ✅ SEGURO (Mongoose sanitiza automaticamente)
const user = await User.findOne({ email: String(req.body.email) });

// ✅ MAIS SEGURO (validar com Joi antes)
const { error, value } = schema.validate(req.body);
```

**2. XSS (Cross-Site Scripting)**
```javascript
// Sanitizar inputs
const sanitizeHtml = require('sanitize-html');

const cleanInput = sanitizeHtml(req.body.comment, {
  allowedTags: [], // Sem tags HTML
  allowedAttributes: {}
});
```

**3. CSRF (Cross-Site Request Forgery)**
```javascript
const csurf = require('csurf');
app.use(csurf({ cookie: true }));

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});
```

**4. Rate Limiting (DDoS)**
```javascript
const rateLimit = require('express-rate-limit');

// Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requisições
});

// Login (mais restritivo)
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 1 hora.'
});

app.use(globalLimiter);
app.post('/login', loginLimiter, loginHandler);
```

**5. CORS**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','), // ['https://app.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
```

#### 7.1.4 Dados Sensíveis

**1. Variáveis de Ambiente**
```bash
# .env (NUNCA COMMITAR!)
JWT_SECRET=seu-secret-super-seguro-minimo-32-caracteres
JWT_REFRESH_SECRET=outro-secret-diferente-tambem-seguro
ENCRYPTION_KEY=chave-32-bytes-para-aes-256-criptografia
DATABASE_URL=mongodb://user:pass@host:port/db
RABBITMQ_URL=amqp://user:pass@host:5672
```

**2. Criptografia de Dados em Repouso**
```javascript
// MongoDB com criptografia
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoEncryption: {
    keyVaultNamespace: 'encryption.__keyVault',
    kmsProviders: {
      local: {
        key: Buffer.from(process.env.MASTER_KEY, 'base64')
      }
    }
  }
});
```

**3. Logs Seguros**
```javascript
// ❌ NUNCA logar dados sensíveis
console.log('Login:', req.body); // Contém senha!

// ✅ Logar apenas dados não sensíveis
const { password, ...safeData } = req.body;
console.log('Login attempt:', safeData);

// ✅ Usar biblioteca de logs com mascaramento
const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.json(),
    winston.format((info) => {
      // Mascarar campos sensíveis
      if (info.password) info.password = '***';
      if (info.token) info.token = info.token.substring(0, 10) + '...';
      return info;
    })()
  )
});
```

### 7.2 RBAC (Role-Based Access Control)

```javascript
// Middleware de autorização
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!req.user.roles || !req.user.roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
    }
    
    next();
  };
};

// Uso
app.get('/admin/users', authorize('admin', 'superadmin'), listUsers);
app.post('/empresas', authorize('admin', 'gerente'), criarEmpresa);
app.get('/usuarios/me', authorize('usuario', 'gerente', 'admin'), getUserProfile);
```

**Matriz de Permissões:**
```javascript
const permissions = {
  superadmin: ['*'], // Acesso total
  admin: [
    'users:read', 'users:write', 'users:delete',
    'empresas:read', 'empresas:write',
    'funcionarios:read', 'funcionarios:write'
  ],
  gerente: [
    'users:read', 'users:write',
    'funcionarios:read', 'funcionarios:write'
  ],
  usuario: [
    'users:read:own', // Apenas seus próprios dados
    'cursos:read'
  ]
};

// Middleware mais granular
const can = (action) => {
  return (req, res, next) => {
    const userPermissions = permissions[req.user.role] || [];
    
    // Verificar permissão wildcard
    if (userPermissions.includes('*')) {
      return next();
    }
    
    // Verificar permissão específica
    if (userPermissions.includes(action)) {
      return next();
    }
    
    // Verificar permissão "own" (apenas seus dados)
    if (action.endsWith(':own') && req.params.id === req.user.id) {
      return next();
    }
    
    return res.status(403).json({ error: 'Sem permissão' });
  };
};

// Uso
app.get('/users/:id', can('users:read'), getUser);
app.put('/users/:id', can('users:write'), updateUser);
app.delete('/users/:id', can('users:delete'), deleteUser);
```

---

## 📊 FASE 8: OBSERVABILIDADE

### 8.1 Os 3 Pilares da Observabilidade

**1. Logs**
- O que aconteceu?
- Narrativa de eventos

**2. Métricas**
- Quanto? Quão rápido?
- Números agregados

**3. Tracing**
- Como a requisição fluiu?
- Caminho completo

### 8.2 Logs Centralizados (ELK Stack ou Winston)

**Opção Simples: Winston + File Transport**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'auth-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Uso
logger.info('Usuário fez login', { userId: '123', email: 'user@example.com' });
logger.error('Erro ao conectar no banco', { error: err.message, stack: err.stack });
logger.warn('Tentativa de login com senha incorreta', { email: 'user@example.com' });
```

**Middleware de Logging para Express:**
```javascript
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log na resposta
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
  });
  
  next();
};

app.use(requestLogger);
```

### 8.3 Métricas (Prometheus + Grafana)

```bash
npm install prom-client
```

```javascript
const promClient = require('prom-client');

// Registrar métricas padrão (CPU, memória, etc)
promClient.collectDefaultMetrics();

// Métrica customizada: Total de requisições HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status']
});

// Métrica customizada: Duração de requisições
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração de requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5] // Buckets em segundos
});

// Middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Em segundos
    
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    }, duration);
  });
  
  next();
};

app.use(metricsMiddleware);

// Endpoint para Prometheus scraping
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

**Dashboard no Grafana:**
- Taxa de requisições por segundo
- Latência (p50, p95, p99)
- Taxa de erro (4xx, 5xx)
- Uso de CPU/Memória

### 8.4 Health Checks

```javascript
// Endpoint básico
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Endpoint detalhado
app.get('/health/detailed', async (req, res) => {
  const checks = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  // Verificar banco de dados
  try {
    await mongoose.connection.db.admin().ping();
    checks.checks.database = { status: 'UP' };
  } catch (error) {
    checks.checks.database = { status: 'DOWN', error: error.message };
    checks.status = 'DOWN';
  }
  
  // Verificar RabbitMQ
  try {
    if (rabbitConnection && rabbitConnection.connection) {
      checks.checks.rabbitmq = { status: 'UP' };
    } else {
      checks.checks.rabbitmq = { status: 'DOWN' };
    }
  } catch (error) {
    checks.checks.rabbitmq = { status: 'DOWN', error: error.message };
    checks.status = 'DOWN';
  }
  
  // Verificar Eureka
  try {
    const response = await fetch('http://eureka-server:8761/health');
    if (response.ok) {
      checks.checks.eureka = { status: 'UP' };
    } else {
      checks.checks.eureka = { status: 'DOWN' };
    }
  } catch (error) {
    checks.checks.eureka = { status: 'DOWN', error: error.message };
  }
  
  const statusCode = checks.status === 'UP' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

### 8.5 Distributed Tracing (Jaeger ou Zipkin)

```bash
npm install jaeger-client
```

```javascript
const initJaeger = require('jaeger-client').initTracer;

const config = {
  serviceName: 'core-service',
  sampler: {
    type: 'const',
    param: 1 // Amostrar 100% (em prod use 0.1 = 10%)
  },
  reporter: {
    agentHost: 'jaeger-agent',
    agentPort: 6832,
    logSpans: true
  }
};

const tracer = initJaeger(config, {});

// Middleware
const tracingMiddleware = (req, res, next) => {
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);
  
  span.setTag('http.method', req.method);
  span.setTag('http.url', req.originalUrl);
  span.setTag('http.user_id', req.user?.id);
  
  req.span = span;
  
  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    if (res.statusCode >= 400) {
      span.setTag('error', true);
    }
    span.finish();
  });
  
  next();
};

app.use(tracingMiddleware);

// Uso em funções
async function buscarUsuario(userId, parentSpan) {
  const span = tracer.startSpan('buscar_usuario', { childOf: parentSpan });
  span.setTag('user_id', userId);
  
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    span.setTag('error', true);
    span.log({ event: 'error', message: error.message });
    throw error;
  } finally {
    span.finish();
  }
}
```

---

## 🐳 FASE 9: CONTAINERIZAÇÃO (Docker)

### 9.1 Dockerfile para Cada Serviço

**Exemplo: auth-service/Dockerfile**

```dockerfile
FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código
COPY . .

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Usuário não-root (segurança)
USER node

# Comando para iniciar
CMD ["node", "index.js"]
```

**Build e Run:**
```bash
# Build
docker build -t auth-service:1.0.0 .

# Run
docker run -p 3001:3001 --env-file .env auth-service:1.0.0
```

### 9.2 Docker Compose para Desenvolvimento

**docker-compose.yml**

```yaml
version: '3.8'

services:
  # Service Discovery
  eureka-server:
    build: ./services/eureka-server
    container_name: eureka-server
    ports:
      - "8761:8761"
    environment:
      - NODE_ENV=development
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8761/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    container_name: api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - EUREKA_SERVER_URL=http://eureka-server:8761
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      eureka-server:
        condition: service_healthy
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Auth Service
  auth-service:
    build: ./services/auth-service
    container_name: auth-service
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo-auth:27017/auth_db
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - EUREKA_SERVER_URL=http://eureka-server:8761
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      eureka-server:
        condition: service_healthy
      mongo-auth:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Core Service
  core-service:
    build: ./services/core-service
    container_name: core-service
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo-core:27017/core_db
      - EUREKA_SERVER_URL=http://eureka-server:8761
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - AUTH_SERVICE_URL=http://auth-service:3001
    depends_on:
      eureka-server:
        condition: service_healthy
      mongo-core:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB para Auth
  mongo-auth:
    image: mongo:7
    container_name: mongo-auth
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=auth_db
    volumes:
      - mongo-auth-data:/data/db
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MongoDB para Core
  mongo-core:
    image: mongo:7
    container_name: mongo-core
    ports:
      - "27018:27017"
    environment:
      - MONGO_INITDB_DATABASE=core_db
    volumes:
      - mongo-core-data:/data/db
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: rabbitmq
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - microservices-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Prometheus (Métricas)
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - microservices-network

  # Grafana (Visualização)
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - microservices-network

  # Jaeger (Tracing)
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "5775:5775/udp"  # Zipkin compact
      - "6831:6831/udp"  # Jaeger compact
      - "6832:6832/udp"  # Jaeger binary
      - "5778:5778"      # Serve configs
      - "16686:16686"    # UI
      - "14268:14268"    # Jaeger collector
      - "14250:14250"    # gRPC
      - "9411:9411"      # Zipkin
    networks:
      - microservices-network

networks:
  microservices-network:
    driver: bridge

volumes:
  mongo-auth-data:
  mongo-core-data:
  rabbitmq-data:
  prometheus-data:
  grafana-data:
```

**Comandos:**
```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs de um serviço
docker-compose logs -f auth-service

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Rebuild de um serviço
docker-compose up -d --build auth-service
```

### 9.3 Prometheus Config

**docker/prometheus/prometheus.yml**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'eureka-server'
    static_configs:
      - targets: ['eureka-server:8761']
  
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
  
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3001']
  
  - job_name: 'core-service'
    static_configs:
      - targets: ['core-service:3002']
```

---

## 🧪 FASE 10: TESTES E DOCUMENTAÇÃO

### 10.1 Estratégia de Testes

**Pirâmide de Testes:**
```
       /\
      /  \    E2E (10%)          ← Poucos, caros, lentos
     /────\   Integração (30%)   ← Testes entre serviços
    /──────\  Unitários (60%)    ← Muitos, baratos, rápidos
   /────────\
```

**1. Testes Unitários (Jest)**

```javascript
// auth-service/tests/unit/authService.test.js
const { login, register } = require('../../services/authService');
const User = require('../../models/User');
const bcrypt = require('bcrypt');

jest.mock('../../models/User');
jest.mock('bcrypt');

describe('Auth Service', () => {
  describe('login', () => {
    it('deve retornar token válido com credenciais corretas', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        isActive: true
      };
      
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      
      const result = await login('test@example.com', 'senha123');
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
    
    it('deve lançar erro com senha incorreta', async () => {
      User.findOne.mockResolvedValue({ /* ... */ });
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(login('test@example.com', 'senhaerrada'))
        .rejects.toThrow('Credenciais inválidas');
    });
  });
});
```

**2. Testes de Integração (Supertest)**

```javascript
// auth-service/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');
const User = require('../../models/User');

describe('Auth API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  });
  
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });
  
  describe('POST /register', () => {
    it('deve criar novo usuário', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          email: 'novo@example.com',
          senha: 'Senha123!@#'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('authUserId');
      expect(response.body.email).toBe('novo@example.com');
      
      // Verificar que foi salvo no banco
      const user = await User.findOne({ email: 'novo@example.com' });
      expect(user).toBeTruthy();
      expect(user.isActive).toBe(true);
    });
    
    it('deve rejeitar email duplicado', async () => {
      await request(app)
        .post('/register')
        .send({ email: 'duplicado@example.com', senha: 'Senha123' })
        .expect(201);
      
      await request(app)
        .post('/register')
        .send({ email: 'duplicado@example.com', senha: 'Senha123' })
        .expect(400);
    });
  });
  
  describe('POST /login', () => {
    it('deve retornar tokens com credenciais válidas', async () => {
      // Criar usuário primeiro
      await request(app)
        .post('/register')
        .send({ email: 'login@example.com', senha: 'Senha123' });
      
      const response = await request(app)
        .post('/login')
        .send({ email: 'login@example.com', senha: 'Senha123' })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
    });
  });
});
```

**3. Testes E2E (Cypress ou Playwright)**

```javascript
// tests/e2e/userFlow.spec.js
describe('Fluxo completo de usuário', () => {
  it('deve registrar, fazer login e acessar perfil', async () => {
    // 1. Registrar
    const registerResponse = await request
      .post('http://api-gateway:3000/auth/register')
      .send({
        email: 'e2e@example.com',
        senha: 'Senha123!@#'
      });
    
    expect(registerResponse.status).toBe(201);
    
    // 2. Login
    const loginResponse = await request
      .post('http://api-gateway:3000/auth/login')
      .send({
        email: 'e2e@example.com',
        senha: 'Senha123!@#'
      });
    
    expect(loginResponse.status).toBe(200);
    const { accessToken } = loginResponse.body;
    
    // 3. Criar perfil no Core Service
    const profileResponse = await request
      .post('http://api-gateway:3000/core/usuarios')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nome: 'Usuário E2E',
        cpf: '12345678900',
        empresaId: 'empresa-teste-id'
      });
    
    expect(profileResponse.status).toBe(201);
    
    // 4. Obter perfil
    const getProfileResponse = await request
      .get('http://api-gateway:3000/core/usuarios/me')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(getProfileResponse.status).toBe(200);
    expect(getProfileResponse.body.nome).toBe('Usuário E2E');
  });
});
```

### 10.2 Documentação da API

**OpenAPI 3.0 (Swagger)**

```yaml
# docs/openapi.yml
openapi: 3.0.0
info:
  title: Microsserviços API
  description: Documentação completa da arquitetura de microsserviços
  version: 1.0.0
  contact:
    name: Time de Desenvolvimento
    email: dev@empresa.com

servers:
  - url: http://localhost:3000
    description: Desenvolvimento
  - url: https://api.producao.com
    description: Produção

tags:
  - name: Auth
    description: Autenticação e Autorização
  - name: Core
    description: Empresas, Usuários e Funcionários

paths:
  /auth/login:
    post:
      tags:
        - Auth
      summary: Fazer login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - senha
              properties:
                email:
                  type: string
                  format: email
                  example: usuario@example.com
                senha:
                  type: string
                  format: password
                  example: Senha123!@#
      responses:
        '200':
          description: Login bem-sucedido
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                    example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  refreshToken:
                    type: string
                    example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  expiresIn:
                    type: integer
                    example: 900
        '400':
          description: Credenciais inválidas
        '429':
          description: Muitas tentativas de login

  /core/usuarios:
    post:
      tags:
        - Core
      summary: Criar novo usuário
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUsuario'
      responses:
        '201':
          description: Usuário criado com sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Usuario'
        '400':
          description: Dados inválidos
        '401':
          description: Não autenticado
        '403':
          description: Sem permissão

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateUsuario:
      type: object
      required:
        - nome
        - email
        - cpf
        - empresaId
      properties:
        nome:
          type: string
          example: João Silva
        email:
          type: string
          format: email
          example: joao@example.com
        cpf:
          type: string
          example: 12345678900
        empresaId:
          type: string
          example: 507f1f77bcf86cd799439011

    Usuario:
      type: object
      properties:
        _id:
          type: string
        nome:
          type: string
        email:
          type: string
        cpf:
          type: string
        perfil:
          type: string
          enum: [admin, gerente, usuario, funcionario]
        status:
          type: string
          enum: [ativo, inativo, suspenso]
        createdAt:
          type: string
          format: date-time
```

### 10.3 Documentação Arquitetural (ADR - Architecture Decision Records)

**docs/architecture/ADR-001-service-discovery.md**

```markdown
# ADR 001: Escolha de Service Discovery

## Status
Aceito

## Contexto
Precisamos de um mecanismo para que os microsserviços descubram uns aos outros dinamicamente, sem IPs fixos.

## Decisão
Implementar um Service Registry customizado em Node.js ao invés de usar Eureka Server (Java/Spring) ou Consul.

## Razões
1. **Mesma stack**: Time já domina Node.js
2. **Simplicidade**: Não precisa de features avançadas
3. **Controle total**: Podemos adaptar às necessidades
4. **Menor overhead**: Não precisa de JVM ou instalação extra

## Consequências
### Positivas
- Desenvolvimento mais rápido
- Manutenção mais simples
- Menos recursos consumidos

### Negativas
- Não tem suporte da comunidade
- Precisamos implementar features manualmente
- Menos maduro que soluções prontas

## Alternativas Consideradas
1. **Eureka Server**: Requer Java, complexo demais para nosso caso
2. **Consul**: Ótima solução mas overhead de instalação
3. **Kubernetes Service Discovery**: Requer migração para K8s (futuro)
```

---

## 📚 RESUMO EXECUTIVO

### Ordem Recomendada de Implementação

**SPRINT 1-2 (2 semanas): Fundação**
1. ✅ Criar estrutura de diretórios
2. ✅ Implementar Service Registry customizado
3. ✅ Dockerizar ambiente de desenvolvimento
4. ✅ Configurar bancos de dados separados

**SPRINT 3-4 (2 semanas): Auth Service**
1. ✅ Extrair autenticação do monolito
2. ✅ Implementar JWT + Refresh Tokens
3. ✅ Adicionar health checks
4. ✅ Testes unitários e integração

**SPRINT 5-6 (2 semanas): Core Service**
1. ✅ Criar modelos de Empresa, Usuário, Funcionário
2. ✅ Implementar CRUDs
3. ✅ Integração com Auth Service
4. ✅ Criptografia de dados sensíveis

**SPRINT 7-8 (2 semanas): API Gateway**
1. ✅ Implementar roteamento
2. ✅ Rate limiting e CORS
3. ✅ Circuit breaker
4. ✅ Logging centralizado

**SPRINT 9-10 (2 semanas): Comunicação Assíncrona**
1. ✅ Configurar RabbitMQ
2. ✅ Implementar eventos de domínio
3. ✅ Padrão SAGA para transações distribuídas

**SPRINT 11-12 (2 semanas): Observabilidade**
1. ✅ Prometheus + Grafana
2. ✅ Distributed Tracing (Jaeger)
3. ✅ Dashboards e alertas

**SPRINT 13-14 (2 semanas): Migração dos Outros Serviços**
1. ✅ Extrair Cursos Service
2. ✅ Extrair Exercícios Service
3. ✅ Extrair Videoaulas Service

**SPRINT 15-16 (2 semanas): Hardening e Produção**
1. ✅ Testes E2E completos
2. ✅ Documentação final
3. ✅ Performance tuning
4. ✅ Deploy em produção

---

## ⚠️ ARMADILHAS COMUNS (Evite estes erros!)

### 1. Microsserviços Prematuros
❌ **ERRO**: Criar microsserviços antes de entender o domínio
✅ **CORRETO**: Começar monolítico, depois separar quando o domínio estiver claro

### 2. Nano-Serviços
❌ **ERRO**: Criar um serviço para cada entidade (UserService, UserAddressService, UserPhotoService...)
✅ **CORRETO**: Agrupar entidades relacionadas em bounded contexts

### 3. Banco de Dados Compartilhado
❌ **ERRO**: Todos os serviços acessam o mesmo banco
✅ **CORRETO**: Database per service, comunicação via APIs

### 4. Transações Distribuídas
❌ **ERRO**: Tentar fazer transações ACID entre serviços
✅ **CORRETO**: Aceitar consistência eventual, usar Saga Pattern

### 5. Over-Engineering
❌ **ERRO**: Implementar Event Sourcing, CQRS, Service Mesh logo de cara
✅ **CORRETO**: Começar simples (REST + RabbitMQ), complexificar quando necessário

### 6. Falta de Monitoramento
❌ **ERRO**: Colocar em produção sem logs, métricas ou tracing
✅ **CORRETO**: Observabilidade é obrigatória desde o dia 1

### 7. Segurança como Afterthought
❌ **ERRO**: "Vamos adicionar segurança depois"
✅ **CORRETO**: HTTPS, autenticação, rate limiting desde o início

---

## 📊 MÉTRICAS DE SUCESSO

### Performance
- ✅ Latência p95 < 500ms
- ✅ Disponibilidade > 99.9% (SLA)
- ✅ Taxa de erro < 0.1%

### Escalabilidade
- ✅ Suportar 1000 req/s por serviço
- ✅ Tempo de deploy < 10 minutos
- ✅ Scaling horizontal sem downtime

### Segurança
- ✅ Zero vulnerabilidades críticas (OWASP Top 10)
- ✅ Todos os dados sensíveis criptografados
- ✅ Auditoria completa de acessos

---

## 🎓 RECURSOS PARA APROFUNDAMENTO

### Livros
- "Building Microservices" - Sam Newman
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Release It!" - Michael Nygard

### Cursos
- "Microservices with Node JS and React" - Udemy
- "Microservices Architecture" - Coursera

### Documentação
- [12 Factor App](https://12factor.net/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## 🤝 CONCLUSÃO

Este plano é **realista** e **incremental**. Não tente implementar tudo de uma vez!

**Prioridades:**
1. 🔥 **CRÍTICO**: Auth Service + Core Service + API Gateway
2. 🔶 **IMPORTANTE**: Observabilidade + Containerização
3. 🔷 **DESEJÁVEL**: Message Broker + Migração outros serviços

**Estimativa Total**: **16 semanas** (4 meses) com 1-2 desenvolvedores

Lembre-se: **Arquitetura de microsserviços é uma jornada, não um destino**. Comece simples, evolua gradualmente baseado em necessidades reais.

Boa sorte! 🚀
