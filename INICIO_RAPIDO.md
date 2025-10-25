# 🚀 GUIA DE INÍCIO RÁPIDO - MICROSSERVIÇOS

## 📋 CHECKLIST PRÉ-IMPLEMENTAÇÃO

Antes de começar, certifique-se de ter:

- [ ] Node.js 18+ instalado
- [ ] Docker e Docker Compose instalados
- [ ] MongoDB instalado (ou usar via Docker)
- [ ] Git configurado
- [ ] Editor de código (VS Code recomendado)
- [ ] Postman ou Insomnia para testar APIs
- [ ] Conhecimento básico de Express.js
- [ ] Conhecimento básico de MongoDB/Mongoose
- [ ] Entendimento de JWT

---

## 🎯 ROADMAP SIMPLIFICADO (16 semanas)

```
MESES 1-2: FUNDAÇÃO
├── Semana 1-2: Service Registry + Docker
├── Semana 3-4: Auth Service
├── Semana 5-6: Core Service
└── Semana 7-8: API Gateway

MESES 3-4: AVANÇADO
├── Semana 9-10: RabbitMQ + Eventos
├── Semana 11-12: Observabilidade
├── Semana 13-14: Migração outros serviços
└── Semana 15-16: Testes + Produção
```

---

## 🏗️ ARQUITETURA VISUAL SIMPLIFICADA

```
CLIENTE (Web/Mobile)
    ↓
API GATEWAY (porta 3000)
    ├─→ EUREKA SERVER (porta 8761)
    ├─→ AUTH SERVICE (porta 3001) → MongoDB Auth
    ├─→ CORE SERVICE (porta 3002) → MongoDB Core
    ├─→ CURSOS SERVICE (porta 3003) → MongoDB Cursos
    └─→ RabbitMQ (porta 5672) ← Todos os serviços
```

---

## 🚦 FASE 1: ESTRUTURA INICIAL (Semana 1)

### 1.1 Criar Estrutura de Pastas

```bash
cd /workspace

# Criar estrutura
mkdir -p services/{eureka-server,api-gateway,auth-service,core-service}
mkdir -p shared/{libs,models,utils}
mkdir -p docker/prometheus
mkdir -p docs/{architecture,api}

# Criar .gitignore geral
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
logs/
*.log
.DS_Store
dist/
build/
coverage/
EOF
```

### 1.2 Criar package.json para Cada Serviço

**Eureka Server:**
```bash
cd services/eureka-server
npm init -y
npm install express dotenv
```

**API Gateway:**
```bash
cd ../api-gateway
npm init -y
npm install express http-proxy-middleware express-rate-limit jsonwebtoken dotenv cors helmet
npm install --save-dev nodemon
```

**Auth Service:**
```bash
cd ../auth-service
npm init -y
npm install express mongoose bcrypt jsonwebtoken dotenv @hapi/joi
npm install --save-dev nodemon jest supertest
```

**Core Service:**
```bash
cd ../core-service
npm init -y
npm install express mongoose dotenv @hapi/joi amqplib
npm install --save-dev nodemon jest supertest
```

---

## 🔥 FASE 2: EUREKA SERVER (Semana 1-2)

### Código Mínimo Viável

**services/eureka-server/index.js:**
```javascript
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// Registry em memória
const serviceRegistry = new Map();

// Registrar serviço
app.post('/register', (req, res) => {
  const { serviceName, host, port } = req.body;
  
  if (!serviceRegistry.has(serviceName)) {
    serviceRegistry.set(serviceName, []);
  }
  
  const instance = {
    id: `${serviceName}-${Date.now()}`,
    host,
    port,
    lastHeartbeat: Date.now(),
    status: 'UP'
  };
  
  serviceRegistry.get(serviceName).push(instance);
  console.log(`✅ Serviço registrado: ${serviceName} em ${host}:${port}`);
  
  res.json({ success: true, instance });
});

// Heartbeat
app.put('/heartbeat/:instanceId', (req, res) => {
  let found = false;
  
  for (const [serviceName, instances] of serviceRegistry.entries()) {
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (instance) {
      instance.lastHeartbeat = Date.now();
      instance.status = 'UP';
      found = true;
      break;
    }
  }
  
  res.json({ success: found });
});

// Descobrir serviço
app.get('/discover/:serviceName', (req, res) => {
  const instances = serviceRegistry.get(req.params.serviceName) || [];
  
  // Filtrar instâncias saudáveis (heartbeat < 30s)
  const healthy = instances.filter(i => 
    Date.now() - i.lastHeartbeat < 30000
  );
  
  if (healthy.length === 0) {
    return res.status(404).json({ error: 'Nenhuma instância disponível' });
  }
  
  // Load balancing: Round Robin simples
  const instance = healthy[Math.floor(Math.random() * healthy.length)];
  res.json(instance);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP',
    services: Array.from(serviceRegistry.keys()),
    timestamp: new Date().toISOString()
  });
});

// Limpeza de instâncias mortas
setInterval(() => {
  for (const [serviceName, instances] of serviceRegistry.entries()) {
    const alive = instances.filter(i => 
      Date.now() - i.lastHeartbeat < 60000 // 60 segundos
    );
    
    if (alive.length !== instances.length) {
      console.log(`🧹 Removendo ${instances.length - alive.length} instâncias mortas de ${serviceName}`);
      serviceRegistry.set(serviceName, alive);
    }
  }
}, 30000); // A cada 30 segundos

const PORT = process.env.PORT || 8761;
app.listen(PORT, () => {
  console.log(`🚀 Eureka Server rodando na porta ${PORT}`);
});
```

**services/eureka-server/.env:**
```env
PORT=8761
NODE_ENV=development
```

**services/eureka-server/package.json (adicionar script):**
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

### Testar:
```bash
cd services/eureka-server
npm run dev

# Em outro terminal:
curl http://localhost:8761/health
```

---

## 🔐 FASE 3: AUTH SERVICE (Semana 3-4)

### Estrutura Mínima

```
services/auth-service/
├── index.js
├── config/
│   └── database.js
├── models/
│   └── User.js
├── routes/
│   └── auth.js
├── services/
│   └── authService.js
├── middleware/
│   └── validation.js
└── .env
```

### Código Mínimo

**services/auth-service/.env:**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/auth_db
JWT_SECRET=seu-secret-super-seguro-minimo-32-caracteres-mude-isso
JWT_REFRESH_SECRET=outro-secret-diferente-tambem-muito-seguro
EUREKA_SERVER_URL=http://localhost:8761
SERVICE_NAME=auth-service
SERVICE_HOST=localhost
```

**services/auth-service/index.js:**
```javascript
const express = require('express');
require('dotenv').config();
const connectDB = require('./config/database');

const app = express();
app.use(express.json());

// Conectar banco
connectDB();

// Rotas
app.use('/auth', require('./routes/auth'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'auth-service' });
});

// Registrar no Eureka
async function registerWithEureka() {
  try {
    const response = await fetch(`${process.env.EUREKA_SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: process.env.SERVICE_NAME,
        host: process.env.SERVICE_HOST,
        port: process.env.PORT
      })
    });
    
    const data = await response.json();
    console.log('✅ Registrado no Eureka:', data.instance.id);
    
    // Heartbeat a cada 20 segundos
    setInterval(async () => {
      await fetch(`${process.env.EUREKA_SERVER_URL}/heartbeat/${data.instance.id}`, {
        method: 'PUT'
      });
    }, 20000);
    
  } catch (error) {
    console.error('❌ Erro ao registrar no Eureka:', error.message);
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service rodando na porta ${PORT}`);
  registerWithEureka();
});
```

**services/auth-service/config/database.js:**
```javascript
const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error.message);
    process.exit(1);
  }
};
```

**services/auth-service/models/User.js:**
```javascript
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  refreshTokens: [{
    token: String,
    expiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
```

**services/auth-service/routes/auth.js:**
```javascript
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Registrar
router.post('/register', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Validar
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Verificar se já existe
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(senha, 12);
    
    // Criar usuário
    const user = await User.create({ email, passwordHash });
    
    res.status(201).json({
      success: true,
      authUserId: user._id,
      email: user.email
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Buscar usuário
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Verificar bloqueio
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ 
        error: 'Conta bloqueada. Tente novamente mais tarde.' 
      });
    }
    
    // Verificar senha
    const isValid = await bcrypt.compare(senha, user.passwordHash);
    if (!isValid) {
      // Incrementar tentativas
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 horas
      }
      await user.save();
      
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Resetar tentativas
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = Date.now();
    
    // Gerar tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Salvar refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    });
    
    // Limitar a 5 refresh tokens por usuário
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    
    await user.save();
    
    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutos em segundos
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token não fornecido' });
    }
    
    // Verificar token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Buscar usuário
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se token está na lista
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    
    // Gerar novo access token
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({
      success: true,
      accessToken,
      expiresIn: 900
    });
    
  } catch (error) {
    console.error('Erro no refresh:', error);
    res.status(401).json({ error: 'Refresh token inválido ou expirado' });
  }
});

// Validar token (para outros serviços)
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      valid: true,
      userId: decoded.userId,
      email: decoded.email
    });
    
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
```

### Testar Auth Service:

```bash
# Terminal 1: Eureka
cd services/eureka-server
npm run dev

# Terminal 2: Auth Service
cd services/auth-service
npm run dev

# Terminal 3: Testar
# Registrar
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","senha":"Senha123!@#"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","senha":"Senha123!@#"}'
```

---

## 📊 PRÓXIMOS PASSOS

Após implementar Eureka Server e Auth Service:

1. **Core Service** (Semana 5-6)
   - Seguir estrutura similar ao Auth Service
   - Implementar modelos de Empresa, Usuário, Funcionário
   - Comunicação com Auth Service

2. **API Gateway** (Semana 7-8)
   - Roteamento para os serviços
   - Validação de JWT
   - Rate limiting

3. **Docker** (Semana 9)
   - Dockerizar todos os serviços
   - Docker Compose para ambiente completo

---

## 🆘 PRECISA DE AJUDA?

### Problemas Comuns:

**MongoDB não conecta:**
```bash
# Verificar se MongoDB está rodando
sudo systemctl status mongodb
# ou
mongosh

# Iniciar MongoDB
sudo systemctl start mongodb
```

**Porta já em uso:**
```bash
# Ver o que está usando a porta
lsof -i :3001

# Matar processo
kill -9 <PID>
```

**Erro de módulo não encontrado:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após cada fase, verifique:

- [ ] Serviço inicia sem erros
- [ ] Health check retorna 200
- [ ] Registra no Eureka corretamente
- [ ] Logs estão claros e informativos
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados conecta
- [ ] Endpoints funcionam no Postman/Insomnia

---

## 📚 DOCUMENTOS RELACIONADOS

- [PLANO_ARQUITETURA_MICROSSERVICOS.md](./PLANO_ARQUITETURA_MICROSSERVICOS.md) - Plano completo
- Documento de ADR (Architecture Decision Records) - Em `docs/architecture/`
- OpenAPI Spec - Em `docs/api/`

---

## 🎉 PARABÉNS!

Você agora tem um plano claro para implementar uma arquitetura de microsserviços robusta e escalável!

Lembre-se: **Comece pequeno, teste muito, evolua gradualmente.** 🚀
